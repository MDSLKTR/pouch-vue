declare module "pouch-vue" {
  import _Vue, { PluginFunction, PluginObject, ComponentOptions } from 'vue'
  import PouchDB from 'pouchdb-core';
  
  interface PouchMethods {
    connect(username: string, password: string, db: any): any;
    createUser(username: string, password: string, db: any): any;
    putUser (username: string, db: any, metadata?: {}): any;
    deleteUser (username: string, db: any): any;
    changePassword (username: string, password: string, db: any): any;
    changeUsername (oldUsername: string, newUsername: string, db: any): any;
    signUpAdmin (adminUsername: string, adminPassword: string, db: any): any;
    deleteAdmin (adminUsername: string, db: any): any;
    disconnect(db: any): any;
    destroy(db: any): any;
    defaults(options?: {}): any;
    close(db: any): any;
    getSession(db: any): any;
    sync(localDB: any, remoteDB: any, options: {}): any;
    push(localDB: any, remoteDB: any, options?: {}): any;
    pull(localDB: any, remoteDB: any, options?: {}): any;
    changes(db: any, options?: {}): any;
    get(db: any, object: any, options?: {}): any;
    put(db: any, object: any, options?: {}): any;
    post(db: any, object: any, options?: {}): any;
    remove(db: any, object: any, options?: {}): any;
    query(db: any, fun: any, options?: {}): any;
    find(db: any, options?: {}): any;
    createIndex(db: any, index?: {}): any;
    allDocs(db: any, options?: {}): any;
    bulkDocs(db: any, docs: any, options?: {}): any;
    compact(db: any, options?: {}): any;
    viewCleanup(db: any): any;
    info(db: any): any;
    putAttachment(db: any, docId: any, rev: any, attachment: any): any;
    getAttachment(db: any, docId: any, attachmentId: any): any;
    deleteAttachment(db: any, docId: any, attachmentId: any, docRev: any): any;
  }

  // extend definition for plugin function: https://github.com/vuejs/vue/blob/dev/types/plugin.d.ts
  // nice intro: https://www.mistergoodcat.com/post/vuejs-plugins-with-typescript

  interface PouchVueOptions {
    pouch: PouchDB.Static;
    defaultDB: string;
    optionsDB: any;
  }
  
  export const install: PluginFunction<PouchVueOptions>;

  // https://vuejs.org/v2/guide/typescript.html#Augmenting-Types-for-Use-with-Plugins

  // for the main Vue instance
  module 'vue/types/vue' {
    // Declare augmentation for Vue
    interface Vue {
      $pouch: PouchMethods;
    }
  }

  // for the components
  module 'vue/types/options' {
    interface ComponentOptions<V extends _Vue> {
      pouch?: any     // this is where the database will be reactive
    }
  }
}










