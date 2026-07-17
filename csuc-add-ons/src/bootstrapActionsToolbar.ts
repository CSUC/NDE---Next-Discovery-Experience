import "@angular/compiler";
import { AppModule } from './app/app.module';
import { bootstrap } from "@angular-architects/module-federation-tools";

export const bootstrapRemoteApp = (bootstrapOptions: any) => {
  return bootstrap(AppModule(bootstrapOptions), {
    production: true,
    appType: 'microfrontend'
  }).then(result => {
    console.log('ActionsToolbar remote app bootstrap success!', result);
    return result;
  });
};
