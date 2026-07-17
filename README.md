# CSUC Primo NDE Add-ons

Aquest repositori agrupa desenvolupaments per a Primo NDE d'Ex Libris seguint un model multi-add-on.

El projecte Angular viu dins de [`csuc-add-ons`](./csuc-add-ons).

## Add-ons

- [`action-toolbar`](./csuc-add-ons/src/addons/action-toolbar/README.md): cinta d'accions configurable des d'Alma, amb botons principals i enllaços informatius sota la cinta.

## Perfils d'add-on

Els add-ons disponibles es declaren a:

```text
csuc-add-ons/addon-profiles.json
```

Exemple actual:

```json
{
  "addons": {
    "action-toolbar": {
      "buildName": "action-toolbar",
      "remoteName": "ActionsToolbar",
      "exposedModule": "./ActionsToolbar"
    }
  }
}
```

Cada entrada defineix:

- `buildName`: nom del directori generat dins de `csuc-add-ons/dist/addons/`.
- `remoteName`: nom del remote de Module Federation.
- `exposedModule`: mòdul que s'ha d'informar a Alma.

## Perfil runtime

Cada add-on té un perfil runtime a:

```text
csuc-add-ons/src/addons/<addon-name>/index.ts
```

Aquest perfil defineix el mapping entre selectors de Primo NDE i components Angular.

Exemple de `action-toolbar`:

```ts
export const actionToolbarProfile = {
  key: 'action-toolbar',
  buildName: 'action-toolbar',
  selectorComponentMap: new Map<string, any>([
    ['nde-search-result-item-container', CustomActionsToolbarComponent]
  ])
};
```

Els perfils runtime s'han de registrar a:

```text
csuc-add-ons/src/addons/registry.ts
```

## Build local

Entrar al projecte Angular:

```bash
cd csuc-add-ons
```

Instal·lar dependències:

```bash
npm ci
```

Construir tots els add-ons declarats a `addon-profiles.json`:

```bash
npm run build
```

La sortida es genera a:

```text
csuc-add-ons/dist/addons/<addon-name>/
```

Per construir només un add-on:

```bash
ADDON_KEY=action-toolbar npm run build:addon
```

El fitxer `csuc-add-ons/build-settings.env` també pot indicar l'add-on actiu per defecte:

```env
ADDON_KEY=action-toolbar
```

## Publicació amb GitHub Pages

El workflow [`deploy-pages.yml`](./.github/workflows/deploy-pages.yml) fa aquests passos:

1. Instal·la dependències dins de `csuc-add-ons` amb `npm ci`.
2. Executa `npm run build` dins de `csuc-add-ons`.
3. Publica `csuc-add-ons/dist/addons` a GitHub Pages.

L'URL de cada add-on tindrà aquest format:

```text
https://csuc.github.io/NDE---Next-Discovery-Experience/<addon-name>/
```

Exemple:

```text
https://csuc.github.io/NDE---Next-Discovery-Experience/action-toolbar/
```

El `remoteEntry.js` quedaria a:

```text
https://csuc.github.io/NDE---Next-Discovery-Experience/action-toolbar/remoteEntry.js
```

## Configuració a Alma

A Alma, cada add-on s'ha de configurar amb:

- URL pública del `remoteEntry.js`.
- Mòdul exposat definit a `csuc-add-ons/addon-profiles.json`.
- Paràmetres JSON propis de l'add-on.

Per a `action-toolbar`:

```text
Remote Entry:
https://csuc.github.io/NDE---Next-Discovery-Experience/action-toolbar/remoteEntry.js

Exposed Module:
./ActionsToolbar
```

La configuració JSON d'exemple és a:

```text
csuc-add-ons/src/addons/action-toolbar/action-toolbar.json
```

## Afegir un nou add-on

1. Crear el component Angular dins de `csuc-add-ons/src/app/`.
2. Crear el directori `csuc-add-ons/src/addons/<addon-name>/`.
3. Crear `csuc-add-ons/src/addons/<addon-name>/index.ts` amb el mapping NDE.
4. Afegir el perfil a `csuc-add-ons/addon-profiles.json`.
5. Registrar el perfil a `csuc-add-ons/src/addons/registry.ts`.
6. Afegir un README propi de l'add-on.
7. Executar `npm run build` dins de `csuc-add-ons` i comprovar que es genera `csuc-add-ons/dist/addons/<addon-name>/`.

