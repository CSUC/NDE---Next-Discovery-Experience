import { CommonModule } from '@angular/common';
import { Component, Inject, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest, Observable, of, Subscription } from 'rxjs';
import { map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { ICON_PATHS } from './action-icons';
import { selectFullDisplayRecordId, selectSearchRecordById } from '../utils/fullDisplayRecordSelector';
import { SHELL_ROUTER } from '../injection-tokens';

interface ActionConfig {
  id: string;
  label: string;
  url: string;
  icon: string;
  target: '_blank' | '_self' | '_parent' | '_top';
  tooltip?: string;
  ariaLabel?: string;
  requires?: string;
}

interface LinkConfig extends ActionConfig {}
interface ResolvedActionConfig extends ActionConfig { resolvedUrl: string; }
interface ResolvedLinkConfig extends LinkConfig { resolvedUrl: string; }

interface ToolbarViewModel {
  isFullDisplayPage: boolean;
  actions: ResolvedActionConfig[];
  links: ResolvedLinkConfig[];
}

interface RawItemConfig {
  id?: unknown;
  label?: unknown;
  url?: unknown;
  icon?: unknown;
  target?: unknown;
  tooltip?: unknown;
  ariaLabel?: unknown;
  requires?: unknown;
}

interface ToolbarParameters {
  buttonLabel?: unknown;
  ariaLabel?: unknown;
  baseUrl?: unknown;
  baseurl?: unknown;
  includeDefaultActions?: unknown;
  actions?: unknown;
  actionsJson?: unknown;
  links?: unknown;
  linksJson?: unknown;
  actionIds?: unknown;
  actionLabels?: unknown;
  actionUrls?: unknown;
  actionIcons?: unknown;
  actionTargets?: unknown;
  actionTooltips?: unknown;
  actionAriaLabels?: unknown;
  actionRequires?: unknown;
  linkIds?: unknown;
  linkLabels?: unknown;
  linkUrls?: unknown;
  linkIcons?: unknown;
  linkTargets?: unknown;
  linkTooltips?: unknown;
  linkAriaLabels?: unknown;
  linkRequires?: unknown;
}

type RecordLike = Record<string, any>;

@Component({
  selector: 'actions-toolbar',
  standalone: true,
  imports: [CommonModule],
  host: { 'data-component-id': 'actions-toolbar' },
  templateUrl: './custom-actions-toolbar.component.html',
  styleUrl: './custom-actions-toolbar.component.scss'
})
export class CustomActionsToolbarComponent implements OnInit, OnDestroy {
  @Input() set hostComponent(value: unknown) {
    const record = this.extractRecordFromHost(value);
    this.debug('hostComponent updated', this.recordDebugInfo(record));
    this.hostRecordSubject.next(value);
  }

  public ariaLabel = 'Accions del registre';
  public visibleActions: ActionConfig[] = [];
  public visibleLinks: LinkConfig[] = [];
  public readonly vm$: Observable<ToolbarViewModel>;

  private readonly actionDefinitions: ActionConfig[];
  private readonly linkDefinitions: LinkConfig[];
  private readonly params: ToolbarParameters;
  private readonly hostRecordSubject = new BehaviorSubject<unknown>(null);
  private readonly urlSubject = new BehaviorSubject<string>(window.location.href);
  private readonly emptyViewModel: ToolbarViewModel = { isFullDisplayPage: false, actions: [], links: [] };
  private readonly emptyContext: RecordLike = { baseUrl: '', baseurl: '', origin: '', docId: '', lang: '', pnx: null, record: null, recordId: '', vid: '' };
  private lastContext: RecordLike = this.emptyContext;
  private routeSubscription?: Subscription;
  private urlPollId?: ReturnType<typeof window.setInterval>;
  private destroyed = false;

  constructor(
    @Optional() @Inject('MODULE_PARAMETERS') moduleParameters: ToolbarParameters | null,
    @Optional() private store: Store | null,
    @Optional() @Inject(SHELL_ROUTER) private shellRouter: Router | null
  ) {
    this.params = moduleParameters ?? {};
    this.ariaLabel = this.asText(this.params.ariaLabel) || this.asText(this.params.buttonLabel) || this.ariaLabel;
    this.actionDefinitions = this.readActions(this.params);
    this.linkDefinitions = this.readLinks(this.params);

    const hostRecord$ = this.hostRecordSubject.pipe(
      map(hostComponent => this.extractRecordFromHost(hostComponent) ?? hostComponent),
      startWith(null),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    const selectedRecordId$ = this.store
      ? this.store.select(selectFullDisplayRecordId).pipe(startWith(null))
      : of(null);
    const activeRecordId$ = combineLatest([selectedRecordId$, hostRecord$, this.urlSubject]).pipe(
      map(([selectedRecordId, hostRecord, url]) =>
        this.normalizeDocId(selectedRecordId) || this.recordIdFromRecord(hostRecord) || this.docIdFromUrl(url)
      ),
      startWith(''),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    const storeRecord$ = this.store
      ? activeRecordId$.pipe(
        switchMap(recordId => recordId
          ? this.store!.select(selectSearchRecordById(recordId)).pipe(startWith(null))
          : of(null)
        )
      )
      : of(null);

    this.vm$ = combineLatest([
      activeRecordId$,
      storeRecord$,
      hostRecord$,
      this.urlSubject
    ]).pipe(
      map(([activeRecordId, storeRecord, hostRecord, url]) => this.buildViewModel(activeRecordId, storeRecord, hostRecord, url)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  public ngOnInit(): void {
    this.debug('component init', { hasStore: Boolean(this.store), selector: 'nde-search-result-item-container' });
    this.routeSubscription = this.shellRouter?.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.refreshUrl();
      }
    });
    this.urlPollId = window.setInterval(() => this.refreshUrl(), 250);
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
    this.routeSubscription?.unsubscribe();

    if (this.urlPollId !== undefined) {
      window.clearInterval(this.urlPollId);
    }
  }

  public iconPath(icon: string | undefined): string {
    return ICON_PATHS[icon || 'link'] ?? ICON_PATHS['link'];
  }

  public trackByAction(_index: number, action: ActionConfig): string {
    return action.id;
  }

  public trackByLink(_index: number, link: LinkConfig): string {
    return link.id;
  }

  public resolveUrl(template: string, context: RecordLike = this.lastContext): string {
    return template.replace(/\{(raw:)?([^{}]+)\}/g, (_match: string, rawPrefix: string | undefined, token: string) => {
      const raw = Boolean(rawPrefix);
      return this.resolveToken(token.trim(), raw, context);
    });
  }

  public execAction(action: ActionConfig | ResolvedActionConfig): void {
    const url = this.resolvedUrl(action);

    if (!url) {
      return;
    }

    if (action.target === '_self') {
      window.location.assign(url);
      return;
    }

    const opened = window.open(url, action.target, 'noopener,noreferrer');
    if (opened) {
      opened.opener = null;
    }
  }

  public execLink(link: LinkConfig | ResolvedLinkConfig, event: MouseEvent): void {
    const url = this.resolvedUrl(link);

    if (!url) {
      event.preventDefault();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
      return;
    }

    event.preventDefault();

    if (link.target === '_self') {
      window.location.assign(url);
      return;
    }

    const opened = window.open(url, link.target, 'noopener,noreferrer');
    if (opened) {
      opened.opener = null;
    }
  }

  private buildViewModel(activeRecordId: unknown, storeRecord: unknown, hostRecord: unknown, url: string): ToolbarViewModel {
    const activeDocId = this.normalizeDocId(activeRecordId) || this.recordIdFromRecord(hostRecord) || this.docIdFromUrl(url);
    const record = this.selectCurrentRecord(activeDocId, storeRecord, hostRecord);
    const context = this.tokenContext(record, activeDocId, url);
    const actions = this.resolveVisibleItems<ResolvedActionConfig>(this.actionDefinitions, context);
    const links = this.resolveVisibleItems<ResolvedLinkConfig>(this.linkDefinitions, context);

    this.lastContext = context;
    this.visibleActions = actions;
    this.visibleLinks = links;
    this.debug('view model updated', {
      activeDocId,
      storeRecord: this.recordDebugInfo(storeRecord),
      hostRecord: this.recordDebugInfo(hostRecord),
      record: this.recordDebugInfo(record),
      actions: actions.map(action => action.resolvedUrl),
      links: links.map(link => link.resolvedUrl)
    });

    return {
      isFullDisplayPage: url.includes('/nde/fulldisplay'),
      actions,
      links
    };
  }

  private selectCurrentRecord(activeDocId: string, storeRecord: unknown, hostRecord: unknown): RecordLike | null {
    const stateRecord = this.asRecord(storeRecord);
    if (stateRecord) {
      return stateRecord;
    }

    if (!activeDocId) {
      return this.asRecord(hostRecord);
    }

    if (this.recordMatchesDocId(hostRecord, activeDocId)) {
      return this.asRecord(hostRecord);
    }

    return null;
  }

  private resolveVisibleItems<T extends ActionConfig>(items: ActionConfig[], context: RecordLike): T[] {
    return items
      .filter(item => !item.requires || this.asText(this.readPath(context, item.requires)) !== '')
      .map(item => ({
        ...item,
        resolvedUrl: this.resolveUrl(item.url, context)
      } as unknown as T));
  }

  private resolvedUrl(item: ActionConfig | ResolvedActionConfig): string {
    return 'resolvedUrl' in item ? item.resolvedUrl : this.resolveUrl(item.url);
  }

  private refreshUrl(): void {
    if (this.destroyed) {
      return;
    }

    const url = window.location.href;
    if (url !== this.urlSubject.value) {
      this.urlSubject.next(url);
    }
  }

  private readActions(params: ToolbarParameters): ActionConfig[] {
    const configuredActions = [
      ...this.readObjectItems<ActionConfig>(params.actions, 'action'),
      ...this.readJsonItems<ActionConfig>(params.actionsJson, 'actionsJson', 'action'),
      ...this.readFlatActions(params)
    ];

    if (configuredActions.length > 0) {
      return configuredActions;
    }

    return this.isTrue(params.includeDefaultActions) ? this.defaultActions() : [];
  }

  private readLinks(params: ToolbarParameters): LinkConfig[] {
    return [
      ...this.readObjectItems<LinkConfig>(params.links, 'link'),
      ...this.readJsonItems<LinkConfig>(params.linksJson, 'linksJson', 'link'),
      ...this.readFlatLinks(params)
    ];
  }

  private readObjectItems<T extends ActionConfig>(rawItems: unknown, itemType: 'action' | 'link'): T[] {
    if (Array.isArray(rawItems)) {
      return this.normalizeItems<T>(rawItems, itemType);
    }

    const itemsText = this.asText(rawItems);
    if (!itemsText) {
      return [];
    }

    try {
      return this.normalizeItems<T>(JSON.parse(itemsText) as unknown, itemType);
    } catch (_error) {
      return this.parseAlmaItems<T>(itemsText, itemType);
    }
  }

  private parseAlmaItems<T extends ActionConfig>(itemsText: string, itemType: 'action' | 'link'): T[] {
    const trimmed = itemsText.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
      return [];
    }

    const body = trimmed.slice(1, -1).trim();
    if (!body) {
      return [];
    }

    return this.splitAlmaActionObjects(body)
      .map((itemText, index) => this.normalizeItem<T>(this.parseAlmaActionObject(itemText), index, itemType))
      .filter((item): item is T => Boolean(item));
  }

  private splitAlmaActionObjects(body: string): string[] {
    return body
      .replace(/^\{/, '')
      .replace(/\}$/, '')
      .split(/\}\s*,\s*\{/)
      .map(actionText => actionText.trim())
      .filter(actionText => actionText.length > 0);
  }

  private parseAlmaActionObject(actionText: string): RawItemConfig {
    const action: Record<string, string> = {};
    const parts = actionText.split(/,\s*(?=[A-Za-z][A-Za-z0-9_]*=)/);

    for (const part of parts) {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      action[key] = value;
    }

    return action;
  }

  private readJsonItems<T extends ActionConfig>(rawItemsJson: unknown, parameterName: string, itemType: 'action' | 'link'): T[] {
    const itemsJson = this.asText(rawItemsJson);
    if (!itemsJson) {
      return [];
    }

    try {
      return this.normalizeItems<T>(JSON.parse(itemsJson) as unknown, itemType);
    } catch (error) {
      console.warn(`Invalid ${parameterName} in ActionsToolbar add-on configuration`, error);
      return [];
    }
  }

  private normalizeItems<T extends ActionConfig>(rawItems: unknown, itemType: 'action' | 'link'): T[] {
    const itemsProperty = itemType === 'action' ? 'actions' : 'links';
    const items = Array.isArray(rawItems) ? rawItems : this.asRecord(rawItems)?.[itemsProperty];
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item, index) => this.normalizeItem<T>(item, index, itemType))
      .filter((item): item is T => Boolean(item));
  }

  private readFlatActions(params: ToolbarParameters): ActionConfig[] {
    const labels = this.asTextArray(params.actionLabels);
    const urls = this.asTextArray(params.actionUrls);

    if (labels.length === 0 || urls.length === 0) {
      return [];
    }

    const ids = this.asTextArray(params.actionIds);
    const icons = this.asTextArray(params.actionIcons);
    const targets = this.asTextArray(params.actionTargets);
    const tooltips = this.asTextArray(params.actionTooltips);
    const ariaLabels = this.asTextArray(params.actionAriaLabels);
    const requires = this.asTextArray(params.actionRequires);
    const maxLength = Math.max(labels.length, urls.length);

    return Array.from({ length: maxLength }, (_value, index) => this.normalizeItem<ActionConfig>({
      id: ids[index],
      label: labels[index],
      url: urls[index],
      icon: icons[index],
      target: targets[index],
      tooltip: tooltips[index],
      ariaLabel: ariaLabels[index],
      requires: requires[index]
    }, index, 'action')).filter((action): action is ActionConfig => Boolean(action));
  }

  private readFlatLinks(params: ToolbarParameters): LinkConfig[] {
    const labels = this.asTextArray(params.linkLabels);
    const urls = this.asTextArray(params.linkUrls);

    if (labels.length === 0 || urls.length === 0) {
      return [];
    }

    const ids = this.asTextArray(params.linkIds);
    const icons = this.asTextArray(params.linkIcons);
    const targets = this.asTextArray(params.linkTargets);
    const tooltips = this.asTextArray(params.linkTooltips);
    const ariaLabels = this.asTextArray(params.linkAriaLabels);
    const requires = this.asTextArray(params.linkRequires);
    const maxLength = Math.max(labels.length, urls.length);

    return Array.from({ length: maxLength }, (_value, index) => this.normalizeItem<LinkConfig>({
      id: ids[index],
      label: labels[index],
      url: urls[index],
      icon: icons[index],
      target: targets[index],
      tooltip: tooltips[index],
      ariaLabel: ariaLabels[index],
      requires: requires[index]
    }, index, 'link')).filter((link): link is LinkConfig => Boolean(link));
  }

  private normalizeItem<T extends ActionConfig>(rawItem: unknown, index: number, itemType: 'action' | 'link'): T | null {
    const item = this.asRecord(rawItem) as RawItemConfig | null;
    if (!item) {
      return null;
    }

    const label = this.asText(item.label);
    const url = this.asText(item.url);

    if (!label || !url) {
      return null;
    }

    return {
      id: this.asText(item.id) || `${itemType}-${index}-${label}`,
      label,
      url,
      icon: this.asText(item.icon) || 'link',
      target: this.normalizeTarget(item.target),
      tooltip: this.asText(item.tooltip) || undefined,
      ariaLabel: this.asText(item.ariaLabel) || undefined,
      requires: this.asText(item.requires) || undefined
    } as T;
  }

  private normalizeTarget(value: unknown): '_blank' | '_self' | '_parent' | '_top' {
    const target = this.asText(value);
    return target === '_self' || target === '_parent' || target === '_top' ? target : '_blank';
  }

  private defaultActions(): ActionConfig[] {
    return [
      {
        id: 'source-record',
        label: 'Registre MARC',
        url: '{baseUrl}/discovery/sourceRecord?vid={vid}&docId={docId}',
        icon: 'description',
        target: '_blank',
        requires: 'recordId'
      }
    ];
  }

  private resolveToken(token: string, raw: boolean, context: RecordLike): string {
    const tokenKey = token.toLowerCase();

    if (tokenKey === 'baseurl' || tokenKey === 'origin') {
      return this.baseUrl();
    }

    const value = this.readPath(context, token);
    const text = this.asText(value);
    return raw ? text : encodeURIComponent(text);
  }

  private tokenContext(record: unknown, fallbackDocId: string, url: string): RecordLike {
    const pnx = this.pnxFromRecord(record);
    const recordId = this.normalizeDocId(
      this.firstText(pnx?.['control']?.['sourcerecordid']) ||
      this.firstText(pnx?.['control']?.['recordid']) ||
      fallbackDocId
    );

    return {
      baseUrl: this.baseUrl(),
      baseurl: this.baseUrl(),
      origin: this.baseUrl(),
      docId: recordId ? `alma${recordId}` : '',
      lang: this.urlParameter(url, 'lang'),
      pnx,
      record: this.asRecord(record),
      recordId,
      vid: this.urlParameter(url, 'vid')
    };
  }

  private pnxFromRecord(record: unknown): RecordLike | null {
    const recordObject = this.asRecord(record);
    if (!recordObject) {
      return null;
    }

    return this.asRecord(recordObject['pnx']) ?? (this.asRecord(recordObject['control']) ? recordObject : null);
  }

  private docIdFromUrl(url: string): string {
    return this.normalizeDocId(this.urlParameter(url, 'docid') || this.urlParameter(url, 'docId'));
  }

  private normalizeDocId(value: unknown): string {
    return this.firstText(value).replace(/^alma/i, '');
  }

  private recordIdFromRecord(record: unknown): string {
    const recordObject = this.asRecord(record);
    const pnx = this.pnxFromRecord(recordObject);
    const control = this.asRecord(pnx?.['control']);

    return this.normalizeDocId(
      this.firstText(control?.['recordid']) ||
      this.firstText(control?.['sourcerecordid']) ||
      this.asText(recordObject?.['id']) ||
      this.asText(recordObject?.['docid']) ||
      this.asText(recordObject?.['docId'])
    );
  }

  private recordMatchesDocId(record: unknown, docId: string): boolean {
    const recordObject = this.asRecord(record);
    const pnx = this.pnxFromRecord(recordObject);
    const control = this.asRecord(pnx?.['control']);
    const candidates = [
      this.firstText(control?.['sourcerecordid']),
      this.firstText(control?.['recordid']),
      this.asText(recordObject?.['id']),
      this.asText(recordObject?.['docid']),
      this.asText(recordObject?.['docId'])
    ];

    return candidates.some(candidate => this.normalizeDocId(candidate) === docId);
  }

  private extractRecordFromHost(value: unknown): unknown {
    const host = this.asRecord(value);
    if (!host) {
      return null;
    }

    return host['searchResult'] ?? host['item'] ?? host['record'] ?? host['result'] ?? (host['pnx'] ? host : null);
  }

  private readPath(root: unknown, path: string): unknown {
    const segments = path.split('.').filter(segment => segment.length > 0);
    let current: unknown = root;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return '';
      }

      const match = segment.match(/^([^\[]+)(?:\[(\d+)\])?$/);
      if (!match) {
        return '';
      }

      const key = match[1];
      const index = match[2] !== undefined ? Number(match[2]) : undefined;
      const currentRecord = this.asRecord(current);

      if (!currentRecord || !(key in currentRecord)) {
        return '';
      }

      current = currentRecord[key];

      if (Array.isArray(current)) {
        current = index !== undefined ? current[index] : current[0];
      }
    }

    return current ?? '';
  }

  private firstText(value: unknown): string {
    if (Array.isArray(value)) {
      return this.asText(value[0]);
    }
    return this.asText(value);
  }

  private baseUrl(): string {
    return this.asText(this.params.baseUrl) || this.asText(this.params.baseurl) || window.location.origin;
  }

  private urlParameter(url: string, name: string): string {
    try {
      return new URL(url).searchParams.get(name) ?? '';
    } catch (_error) {
      return new URLSearchParams(window.location.search).get(name) ?? '';
    }
  }

  private isTrue(value: unknown): boolean {
    return value === true || this.asText(value).toLowerCase() === 'true';
  }

  private asRecord(value: unknown): RecordLike | null {
    return value !== null && typeof value === 'object' ? value as RecordLike : null;
  }

  private asText(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private asTextArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(item => this.asText(item));
    }

    const text = this.asText(value);
    return text ? [text] : [];
  }

  private debug(message: string, payload?: unknown): void {
    if (!this.debugEnabled()) {
      return;
    }

    console.info('[ActionsToolbar]', message, payload ?? '');
  }

  private debugEnabled(): boolean {
    try {
      return new URL(window.location.href).searchParams.get('actionsToolbarDebug') === 'true' ||
        window.localStorage.getItem('actionsToolbarDebug') === 'true';
    } catch (_error) {
      return false;
    }
  }

  private recordDebugInfo(record: unknown): Record<string, string> {
    const pnx = this.pnxFromRecord(record);
    return {
      sourcerecordid: this.firstText(pnx?.['control']?.['sourcerecordid']),
      recordid: this.firstText(pnx?.['control']?.['recordid']),
      title: this.firstText(pnx?.['display']?.['title'])
    };
  }
}
