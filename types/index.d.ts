declare module "pouch-vue" {
  import _Vue, { PluginObject, ComponentOptions } from 'vue'
  import PouchDB from 'pouchdb-core';
  
  interface PublicPouchVueMethods {
    connect(username: string, password: string, db?: any): any;
    createUser(username: string, password: string, db?: any): any;
    putUser (username: string, metadata?: {}, db?: any): any;
    deleteUser (username: string, db?: any): any;
    changePassword (username: string, password: string, db?: any): any;
    changeUsername (oldUsername: string, newUsername: string, db?: any): any;
    signUpAdmin (adminUsername: string, adminPassword: string, db?: any): any;
    deleteAdmin (adminUsername: string, db?: any): any;
    disconnect(db?: any): any;
    destroy(db?: any): any;
    defaults(options?: {}): any;
    close(db?: string): any;
    getSession(db?: any): any;
    sync(localDB: string, remoteDB: string, options?: {}): any;
    push(localDB: string, remoteDB: string, options?: {}): any;
    pull(localDB: string, remoteDB: string, options?: {}): any;
    changes(db: string, options?: {}): any;
    get(db: string, object: any, options?: {}): any;
    put(db: string, object: any, options?: {}): any;
    post(db: string, object: any, options?: {}): any;
    remove(db: string, object: any, options?: {}): any;
    query(db: string, fun: any, options?: {}): any;
    find(db: string, options?: {}): any;
    createIndex(db: string, index?: {}): any;
    allDocs(db: string, options?: {}): any;
    bulkDocs(db: string, docs: any, options?: {}): any;
    compact(db: string, options?: {}): any;
    viewCleanup(db: string): any;
    info(db: string): any;
    putAttachment(db: string, docId: any, rev: any, attachment: any): any;
    getAttachment(db: string, docId: any, attachmentId: any): any;
    deleteAttachment(db: string, docId: any, attachmentId: any, docRev: any): any;
  }

  // extend definition for plugin function: https://github.com/vuejs/vue/blob/dev/types/plugin.d.ts
  // nice intro: https://www.mistergoodcat.com/post/vuejs-plugins-with-typescript

  interface PouchVueOptions {
    pouch: PouchDB.Static;
    defaultDB: string;
    debug: string;
    optionsDB: any;
  }
  
  export var {install, mixin} : PluginObject<PouchVueOptions>;

  // https://vuejs.org/v2/guide/typescript.html#Augmenting-Types-for-Use-with-Plugins

  // for the main Vue instance
  module 'vue/types/vue' {
    // Declare augmentation for Vue
    interface Vue {
      $pouch: PublicPouchVueMethods;
    }
  }

  // for the components
  module 'vue/types/options' {
    interface ComponentOptions<V extends _Vue> {
      pouch?: any     // this is where the database will be reactive
    }
  }
}
