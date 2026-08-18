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

  it('should only show actions with recordIdStartsWith when the record id matches', async () => {
    await configure({
      actions: [
        {
          label: 'Demanar document',
          url: 'https://request.example/{recordId}',
          icon: 'local_library',
          recordIdStartsWith: '99'
        }
      ]
    });
    fixture = TestBed.createComponent(CustomActionsToolbarComponent);
    component = fixture.componentInstance;
    component.hostComponent = {
      searchResult: {
        pnx: {
          control: { sourcerecordid: ['881234567'] }
        }
      }
    };
    fixture.detectChanges();

    expect(component.visibleActions.length).toBe(0);

    component.hostComponent = {
      searchResult: {
        pnx: {
          control: { sourcerecordid: ['991234567'] }
        }
      }
    };
    fixture.detectChanges();

    expect(component.visibleActions.length).toBe(1);
    expect(component.resolveUrl(component.visibleActions[0].url)).toBe('https://request.example/991234567');
  });

  it('should generate action buttons from pnx.delivery.link linktorsrc URLs', async () => {
    await configure({
      linkActions: [
        {
          label: 'Text complet',
          containsAny: ['mdc', 'arca'],
          icon: 'open_in_new'
        },
        {
          label: "Reproducció d'alta qualitat (compra en línia)",
          containsAny: ['copiescofre'],
          icon: 'settings_overscan'
        }
      ]
    });
    fixture = TestBed.createComponent(CustomActionsToolbarComponent);
    component = fixture.componentInstance;
    component.hostComponent = {
      searchResult: {
        pnx: {
          delivery: {
            link: [
              {
                linkType: 'linktorsrc',
                linkURL: 'https://copiescofre.bnc.cat/documents/view/abc',
                displayLabel: 'Venda en línia de reproduccions digitals'
              },
              {
                linkType: 'linktorsrc',
                linkURL: 'https://mdc.csuc.cat/digital/collection/manuscritBC/id/260043',
                displayLabel: 'Accés lliure'
              }
            ]
          }
        }
      }
    };
    fixture.detectChanges();

    expect(component.visibleActions.map(action => action.label)).toEqual([
      'Text complet',
      "Reproducció d'alta qualitat (compra en línia)"
    ]);
    expect(component.visibleActions[0].url).toBe('https://mdc.csuc.cat/digital/collection/manuscritBC/id/260043');
    expect(component.visibleActions[1].url).toBe('https://copiescofre.bnc.cat/documents/view/abc');
  });

  it('should generate action buttons from pnx.addata.url when delivery links are not readable objects', async () => {
    await configure({
      linkActions: [
        {
          label: 'Text complet',
          containsAny: ['mdc', 'arca'],
          icon: 'open_in_new'
        }
      ]
    });
    fixture = TestBed.createComponent(CustomActionsToolbarComponent);
    component = fixture.componentInstance;
    component.hostComponent = {
      searchResult: {
        pnx: {
          addata: {
            url: ['https://arca.bnc.cat/arcabib_pro/ca/consulta/registro.do?id=2653']
          },
          delivery: {
            link: ['[object Object]', '[object Object]']
          }
        }
      }
    };
    fixture.detectChanges();

    expect(component.visibleActions.length).toBe(1);
    expect(component.visibleActions[0].label).toBe('Text complet');
    expect(component.visibleActions[0].url).toBe('https://arca.bnc.cat/arcabib_pro/ca/consulta/registro.do?id=2653');
  });

  it('should ignore pnx.delivery.link entries that are not linktorsrc', async () => {
    await configure({
      linkActions: [
        {
          label: 'Text complet',
          containsAny: 'mdc|arca',
          icon: 'open_in_new'
        }
      ]
    });
    fixture = TestBed.createComponent(CustomActionsToolbarComponent);
    component = fixture.componentInstance;
    component.hostComponent = {
      searchResult: {
        pnx: {
          delivery: {
            link: [
              {
                linkType: 'thumbnail',
                linkURL: 'https://mdc.csuc.cat/digital/collection/manuscritBC/id/260043'
              }
            ]
          }
        }
      }
    };
    fixture.detectChanges();

    expect(component.visibleActions.length).toBe(0);
  });
});
