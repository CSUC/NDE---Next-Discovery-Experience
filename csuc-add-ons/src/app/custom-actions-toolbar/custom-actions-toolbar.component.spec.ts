import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomActionsToolbarComponent } from './custom-actions-toolbar.component';

describe('CustomActionsToolbarComponent', () => {
  let component: CustomActionsToolbarComponent;
  let fixture: ComponentFixture<CustomActionsToolbarComponent>;

  function configure(moduleParameters: unknown = { includeDefaultActions: false }): Promise<void> {
    return TestBed.configureTestingModule({
      imports: [CustomActionsToolbarComponent],
      providers: [{ provide: 'MODULE_PARAMETERS', useValue: moduleParameters }]
    }).compileComponents();
  }

  it('should create without configured actions', async () => {
    await configure();
    fixture = TestBed.createComponent(CustomActionsToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.visibleActions.length).toBe(0);
    expect(component.visibleLinks.length).toBe(0);
  });

  it('should parse Alma-friendly flat action arrays', async () => {
    await configure({
      includeDefaultActions: false,
      actionLabels: ['Google Scholar'],
      actionUrls: ['https://scholar.google.com/scholar?q={pnx.display.title[0]}'],
      actionIcons: ['search']
    });
    fixture = TestBed.createComponent(CustomActionsToolbarComponent);
    component = fixture.componentInstance;
    component.hostComponent = {
      searchResult: {
        pnx: {
          display: { title: ['Titol de prova'] }
        }
      }
    };
    fixture.detectChanges();

    expect(component.visibleActions.length).toBe(1);
    expect(component.resolveUrl(component.visibleActions[0].url)).toBe('https://scholar.google.com/scholar?q=Titol%20de%20prova');
  });

  it('should support configured links below the action ribbon', async () => {
    await configure({
      links: [
        {
          label: "Temps d'espera",
          url: 'https://www.bnc.cat/Serveis/Peticio-de-documents/Temps-d-espera?title={pnx.display.title[0]}',
          icon: 'schedule'
        }
      ]
    });
    fixture = TestBed.createComponent(CustomActionsToolbarComponent);
    component = fixture.componentInstance;
    component.hostComponent = {
      searchResult: {
        pnx: {
          display: { title: ['Titol de prova'] }
        }
      }
    };
    fixture.detectChanges();

    expect(component.visibleLinks.length).toBe(1);
    expect(component.resolveUrl(component.visibleLinks[0].url)).toBe('https://www.bnc.cat/Serveis/Peticio-de-documents/Temps-d-espera?title=Titol%20de%20prova');
  });

  it('should support object actions and record id shortcuts', async () => {
    await configure({
      actions: [
        {
          label: 'Registre MARC',
          url: '{baseUrl}/discovery/sourceRecord?vid={vid}&docId={docId}',
          icon: 'description'
        }
      ],
      baseUrl: 'https://example.primo.exlibrisgroup.com'
    });
    fixture = TestBed.createComponent(CustomActionsToolbarComponent);
    component = fixture.componentInstance;
    component.hostComponent = {
      searchResult: {
        pnx: {
          control: { sourcerecordid: ['991234567'] }
        }
      }
    };
    fixture.detectChanges();

    expect(component.resolveUrl(component.visibleActions[0].url)).toBe('https://example.primo.exlibrisgroup.com/discovery/sourceRecord?vid=&docId=alma991234567');
  });
});
