# action-toolbar

Add-on de Primo NDE que mostra una cinta d'accions configurable a la vista completa del registre. Permet definir botons principals (`actions`) i enllaços informatius sota la cinta (`links`) a partir del JSON de configuració de l'add-on a Alma.

## Com es mostra

- Selector NDE: `nde-search-result-item-container`
- Component Angular: `CustomActionsToolbarComponent`
- Selector Angular intern: `actions-toolbar`
- Condició de visualització: només es renderitza quan la URL conté `/nde/fulldisplay`

Això evita que la cinta aparegui als resultats de cerca i la limita al full display.

## Dades de Module Federation

- Add-on key: `action-toolbar`
- Build name: `action-toolbar`
- Remote name: `ActionsToolbar`
- Exposed module: `./ActionsToolbar`
- Fitxer remot: `remoteEntry.js`

Aquests valors es defineixen a [`addon-profiles.json`](../../../addon-profiles.json).

## Build

Des de l'arrel del projecte:

```bash
npm run build
```

O només aquest add-on:

```bash
ADDON_KEY=action-toolbar npm run build:addon
```

Sortida generada:

```text
dist/addons/action-toolbar/
```

## URL pública

L'URL és:

```text
https://csuc.github.io/NDE---Next-Discovery-Experience/action-toolbar/
```

El `remoteEntry.js` queda a:

```text
https://csuc.github.io/NDE---Next-Discovery-Experience/action-toolbar/remoteEntry.js
```

## Configuració a Alma

A Alma, configurar l'add-on amb:

```text
Remote Entry:
https://csuc.github.io/NDE---Next-Discovery-Experience/action-toolbar/remoteEntry.js

Exposed Module:
./ActionsToolbar
```

## Exemple de JSON

El fitxer [`action-toolbar.json`](./action-toolbar.json) conté un exemple complet:

```json
{
  "ariaLabel": "Accions del registre",
  "baseUrl": "https://csuc-gepa.primo.exlibrisgroup.com",
  "actions": [
    {
      "label": "Demanar document",
      "url": "https://request.bnc.cat/peticio/crear/{pnx.control.sourcerecordid[0]}",
      "icon": "local_library",
      "target": "_blank"
    },
    {
      "label": "Demanar reproducció",
      "url": "https://www.bnc.cat/Serveis/Reproduccio-de-documents/Sol-licitud-de-reproduccio-de-documents-i-autoritzacio-d-us-public?numreg={pnx.control.sourcerecordid[0]}&mattype={pnx.display.type[0]}",
      "icon": "search",
      "target": "_blank"
    },
    {
      "label": "Préstec interbibliotecari",
      "url": "https://pi.csuc.cat/index.php?bibid={recordId}&tipusmat={pnx.display.type[0]}&doi={pnx.addata.doi[0]}&aulast={pnx.sort.author[0]}&isbn={pnx.addata.isbn[0]}&issn={pnx.addata.issn[0]}&title={pnx.display.title[0]}&atitle={pnx.addata.atitle[0]}&volume={pnx.addata.volume[0]}&issue={pnx.addata.issue[0]}&pages={pnx.addata.pages[0]}&lugar_pub={pnx.display.place[0]}&date={pnx.sort.creationdate[0]}&edition={pnx.display.edition[0]}&editor={pnx.display.publisher[0]}",
      "icon": "send",
      "target": "_blank"
    },
    {
      "label": "Registre MARC",
      "url": "{baseUrl}/discovery/sourceRecord?vid={vid}&docId={docId}",
      "icon": "description",
      "target": "_blank",
    }
  ],
  "links": [
    {
      "label": "Condicions i funcionament del servei de petició de documents de la BC",
      "url": "http://www.bnc.cat/Serveis/Peticio-de-documents",
      "icon": "help",
      "target": "_blank"
    },
    {
      "label": "Temps d'espera",
      "url": "http://www.bnc.cat/Serveis/Peticio-de-documents/Temps-d-espera",
      "icon": "schedule",
      "target": "_blank"
    }
  ]
}
```

## Estructura del JSON

### Camps globals

- `ariaLabel`: etiqueta accessible del bloc. Opcional.
- `baseUrl`: URL base de Primo per construir enllaços interns.
- `actions`: botons principals de la cinta.
- `links`: enllaços informatius sota la cinta.
- `includeDefaultActions`: si és `true` i no hi ha `actions`, mostra l'acció per defecte `Registre MARC`.

### Camps d'una action o d'un link

- `label`: text visible. Obligatori.
- `url`: URL de destinació. Obligatori.
- `icon`: icona. Opcional. Si no existeix, s'usa `link`.
- `target`: `_blank`, `_self`, `_parent` o `_top`. Per defecte: `_blank`.
- `tooltip`: tooltip opcional.
- `ariaLabel`: etiqueta accessible alternativa.
- `id`: identificador intern opcional.

## Tokens disponibles

- `{recordId}`: primer `pnx.control.sourcerecordid`, o `pnx.control.recordid` si no existeix.
- `{docId}`: `alma` + `{recordId}`.
- `{baseUrl}` o `{baseurl}`: valor de `baseUrl`.
- `{origin}`: equivalent a `baseUrl`.
- `{vid}`: paràmetre `vid` de la URL actual.
- `{lang}`: paràmetre `lang` de la URL actual.
- `{pnx.seccio.camp[index]}`: qualsevol camp PNX. Exemple: `{pnx.display.title[0]}`.
- `{record.camp}`: qualsevol camp disponible dins l'objecte de registre.
- `{raw:pnx.display.title[0]}`: valor sense `encodeURIComponent`.

## Icones disponibles

Les icones es defineixen a [`action-icons.ts`](../../app/custom-actions-toolbar/action-icons.ts).

Valors disponibles:

- `bookmark`
- `content_copy`
- `description`
- `download`
- `email`
- `help`
- `link`
- `local_library`
- `open_in_new`
- `request_quote`
- `schedule`
- `search`
- `send`

Si el JSON indica una icona no definida, es mostra `link`.

## Fitxers relacionats

- Perfil runtime: [`index.ts`](./index.ts)
- Exemple JSON: [`action-toolbar.json`](./action-toolbar.json)
- Component: [`../../app/custom-actions-toolbar`](../../app/custom-actions-toolbar)
- Registre global: [`../registry.ts`](../registry.ts)
