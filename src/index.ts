/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-authentication" />
/// <reference types="vue" />

import _Vue, {VueConstructor, PluginObject } from 'vue';

import { isRemote } from 'pouchdb-utils';

type PouchDatabases = Record<string, PouchDB.Database>;

interface PouchVueOptions {
    pouch: PouchDB.Static;
    defaultDB: string;
    debug: string;
    optionsDB: any;
  }

interface PouchAPI {
    version: string;
    connect(username: string, password: string, db?: PouchDB.Database): Promise<any>;
    createUser(username: string, password: string, db?: PouchDB.Database): Promise<any>;
    putUser (username: string, metadata?: {}, db?: PouchDB.Database): Promise<{} | PouchDB.Core.Response>;
    deleteUser (username: string, db?: PouchDB.Database): Promise<{} | PouchDB.Core.Response>;
    changePassword (username: string, password: string, db?: PouchDB.Database): Promise<{} | PouchDB.Core.Response>;
    changeUsername (oldUsername: string, newUsername: string, db?: PouchDB.Database): Promise<{} | PouchDB.Core.Response>;
    signUpAdmin (adminUsername: string, adminPassword: string, db?: PouchDB.Database): Promise<string | {}>;
    deleteAdmin (adminUsername: string, db?: PouchDB.Database): Promise<string | {}>;
    disconnect(db?: PouchDB.Database): void;
    destroy(db?: string): void;
    defaults(options?: PouchDB.Configuration.DatabaseConfiguration): void;
    close(db?: string): Promise<void>;
    getSession(db?: PouchDB.Database): Promise<{}>;
    sync(localDB: string, remoteDB: string, options?: {}): PouchDB.Replication.Sync<{}>;
    push(localDB: string, remoteDB: string, options?: {}): PouchDB.Replication.Replication<{}>;
    pull(localDB: string, remoteDB: string, options?: {}): PouchDB.Replication.Replication<{}>;
    changes(db: string, options?: {}): PouchDB.Core.Changes<{}>;
    get(db: string, object: any, options?: PouchDB.Core.GetOptions): Promise<any>;
    put(db: string, object: any, options?: PouchDB.Core.PutOptions): Promise<PouchDB.Core.Response>;
    post(db: string, object: any, options?: PouchDB.Core.Options): Promise<PouchDB.Core.Response>
    remove(db: string, object: any, options?: PouchDB.Core.Options): Promise<PouchDB.Core.Response>
    query(db: string, fun: any, options?: PouchDB.Query.Options<{},{}>): Promise<PouchDB.Query.Response<{}>>;
    find(db: string, options?: PouchDB.Find.FindRequest<{}>): Promise<PouchDB.Find.FindResponse<{}>>
    createIndex(db: string, index?: PouchDB.Find.CreateIndexOptions): Promise<PouchDB.Find.CreateIndexResponse<{}>>
    allDocs(db: string, options?: PouchDB.Core.AllDocsWithKeyOptions | PouchDB.Core.AllDocsWithKeysOptions | PouchDB.Core.AllDocsWithinRangeOptions | PouchDB.Core.AllDocsOptions): Promise<PouchDB.Core.AllDocsResponse<{}>>;
    bulkDocs(db: string, docs: PouchDB.Core.PutDocument<{}>[], options?: PouchDB.Core.BulkDocsOptions): Promise<(PouchDB.Core.Response | PouchDB.Core.Error)[]>;
    compact(db: string, options?: PouchDB.Core.CompactOptions): Promise<PouchDB.Core.Response>;
    viewCleanup(db: string): Promise<PouchDB.Core.BasicResponse>;
    info(db: string): Promise<PouchDB.Core.DatabaseInfo>;
    // rev in putAttachment is optional
    putAttachment(db: string, docId: PouchDB.Core.DocumentId, rev: string, attachment: {id: string, data: PouchDB.Core.AttachmentData, type: string}): Promise<PouchDB.Core.Response>;
    getAttachment(db: string, docId: PouchDB.Core.DocumentId, attachmentId: PouchDB.Core.AttachmentId): Promise<Blob | Buffer>;
    deleteAttachment(db: string, docId: PouchDB.Core.DocumentId, attachmentId: PouchDB.Core.AttachmentId, docRev: PouchDB.Core.RevisionId): Promise<PouchDB.Core.RemoveAttachmentResponse>;
  }


// well explained in vue documentation: https://vuejs.org/v2/guide/typescript.html#Augmenting-Types-for-Use-with-Plugins
// further explanation: https://herringtondarkholme.github.io/2017/10/12/vue-ts3/
declare module 'vue/types/vue' {
    interface VueConstructor {
        util: {
            mergeOptions
            (
                parent: Object,
                child: Object,
                vm?: any
            ): Object;
        }
        // the constructor has an options object but the vue instance uses $options
        options: any;
    }

    // Declare augmentation for Vue
    interface Vue {
        $pouch: PouchAPI;
        $databases: PouchDatabases;
        _liveFeeds: Record<string, PouchDB.LiveFind.LiveFeed>;
        options: any;
      }
}

// declare augmentation for the component options
declare module 'vue/types/options' {
    interface ComponentOptions<V extends _Vue> {
        // this specifies the reactive pouch database that will be created in the data object
        pouch?: any
    }
}


let vue: VueConstructor,
    pouch: PouchDB.Static,
    defaultDB: string,
    defaultUsername: string,
    defaultPassword: string,
    databases: PouchDatabases = {},
    optionsDB: PouchDB.Configuration.DatabaseConfiguration | undefined;

let vuePouch: any = {
    // lifecycle hooks for mixin

    // make sure the pouch databases are defined on the data object
    // before its walked and made reactive
    beforeCreate() {
        var pouchOptions = this.$options.pouch;

        if (!pouchOptions) {
            return;
        }

        if (typeof pouchOptions === 'function') {
            pouchOptions = pouchOptions();
        }

        if (!this.$options.data) {
            this.$options.data = function() {
                return {};
            };
        }

        let oldDataFunc = this.$options.data;

        // the data function is explicitly passed a vm object in
        this.$options.data= function(vm: any) {
            // get the Vue instance's data object from the constructor
            var plainObject = oldDataFunc.call(vm, vm);

            // map the pouch databases to an object in the Vue instance's data
            Object.keys(pouchOptions).map(function(key) {
                if (typeof plainObject[key] === 'undefined') {
                    plainObject[key] = null;
                }
            });

            // return the Vue instance's data with the additional pouch objects
            // the Vue instance's data will be made reactive before the 'created' lifecycle hook runs
            return plainObject;
        };

    },
    // now that the data object has been observed and made reactive
    // the api can be set up
    created() {
        if (!vue) {
            console.warn('pouch-vue not installed!');
            return;
        }

        let vm: _Vue = this;

        vm._liveFeeds = {};

        if (defaultDB) {
            databases[defaultDB] = new pouch(defaultDB, optionsDB);
            registerListeners(databases[defaultDB]);
        }

        function fetchSession(db: PouchDB.Database = databases[defaultDB]) {
            return new Promise(resolve => {
                db
                    .getSession()
                    .then(session => {
                        db
                            .getUser(session.userCtx.name)
                            .then(userData => {
                                let userObj = Object.assign(
                                    {},
                                    session.userCtx,
                                    userData
                                );
                                resolve({
                                    user: userObj,
                                    hasAccess: true,
                                });
                            })
                            .catch(error => {
                                resolve(error);
                            });
                    })
                    .catch(error => {
                        resolve(error);
                    });
            });
        }

        function login(db: PouchDB.Database = databases[defaultDB]) {
            return new Promise(resolve => {

                db
                    .logIn(defaultUsername, defaultPassword)
                    .then(user => {
                        db
                            .getUser(user.name)
                            .then(userData => {
                                let userObj = Object.assign(
                                    {},
                                    user,
                                    userData
                                );
                                resolve({
                                    user: userObj,
                                    hasAccess: true,
                                });
                            })
                            .catch(error => {
                                resolve(error);
                            });
                    })
                    .catch(error => {
                        resolve(error);
                    });
            });
        }

        function makeInstance(db: string, opts = {}) {
            databases[db] = new pouch(db, opts);
            registerListeners(databases[db]);
        }

        function registerListeners(db: PouchDB.Database) {
            db.on('created', name => {
                vm.$emit('pouchdb-db-created', {
                    db: name,
                    ok: true,
                });
            });
            db.on('destroyed', name => {
                vm.$emit('pouchdb-db-destroyed', {
                    db: name,
                    ok: true,
                });
            });
        }

        let $pouch: PouchAPI = {
            version: '__VERSION__',
            connect(username, password, db = databases[defaultDB]) {
                return new Promise(resolve => {
                    defaultUsername = username;
                    defaultPassword = password;

                    if (!isRemote(db)) {
                        resolve({
                            message: 'database is not remote',
                            error: 'bad request',
                            status: 400,
                        });
                        return;
                    }

                    login(db).then(res => {
                        resolve(res);
                    });
                });
            },
            createUser(username, password, db = databases[defaultDB]) {
                return db
                    .signUp(username, password)
                    .then(() => {
                        return vm.$pouch.connect(username, password, db);
                    })
                    .catch(error => {
                        return new Promise(resolve => {
                            resolve(error);
                        });
                    });
            },
            putUser(username, metadata = {}, db = databases[ defaultDB ]) {
                return db
                    .putUser(username, {
                        metadata,
                    })
                    .catch(error => {
                        return new Promise(resolve => {
                            resolve(error);
                        });
                    });
            },
            deleteUser(username, db = databases[ defaultDB ]) {
                return db
                    .deleteUser(username)
                    .catch(error => {
                        return new Promise(resolve => {
                            resolve(error);
                        });
                    });
            },
            changePassword(username, password, db = databases[ defaultDB ]) {
                return db
                    .changePassword(username, password)
                    .catch(error => {
                        return new Promise(resolve => {
                            resolve(error);
                        });
                    });
            },
            changeUsername(oldUsername, newUsername, db = databases[ defaultDB ]) {
                return db
                    .changeUsername(oldUsername, newUsername)
                    .catch(error => {
                        return new Promise(resolve => {
                            resolve(error);
                        });
                    });
            },
            signUpAdmin(adminUsername, adminPassword, db = databases[ defaultDB ]) {
                return db
                    .signUpAdmin(adminUsername, adminPassword)
                    .catch(error => {
                        return new Promise(resolve => {
                            resolve(error);
                        });
                    });
            },
            deleteAdmin(adminUsername, db = databases[ defaultDB ]) {
                return db
                    .deleteAdmin(adminUsername)
                    .catch(error => {
                        return new Promise(resolve => {
                            resolve(error);
                        });
                    });
            },
            disconnect(db = databases[defaultDB]) {
                return new Promise(resolve => {
                    defaultUsername = null;
                    defaultPassword = null;

                    if (!isRemote(db)) {
                        resolve({
                            message: 'database is not remote',
                            error: 'bad request',
                            status: 400,
                        });
                        return;
                    }

                    db
                        .logOut()
                        .then(res => {
                            resolve({
                                ok: res.ok,
                                user: null,
                                hasAccess: false,
                            });
                        })
                        .catch(error => {
                            resolve(error);
                        });
                });
            },

            destroy(db) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].destroy().then(() => {
                    if (db !== defaultDB) {
                        delete databases[db];
                    }
                });
            },

            defaults(options = {}) {
                pouch.defaults(options);
            },

            close(db) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].close().then(() => {
                    if (db !== defaultDB) {
                        delete databases[db];
                    }
                });
            },

            getSession(db = databases[defaultDB]) {
                if (!isRemote(db)) {
                    return new Promise(resolve => {
                        resolve({
                            message: 'database is not remote',
                            error: 'bad request',
                            status: 400,
                        });
                    });
                }
                return fetchSession();
            },

            sync(localDB, remoteDB, options = {}) {
                if (!databases[localDB]) {
                    makeInstance(localDB);
                }
                if (!databases[remoteDB]) {
                    makeInstance(remoteDB, optionsDB);
                }
                if (!defaultDB) {
                    defaultDB = remoteDB;
                }

                let _options = Object.assign(
                        {},
                        {
                            live: true,
                            retry: true,
                            back_off_function: delay => {
                                if (delay === 0) {
                                    return 1000;
                                }
                                return delay * 3;
                            },
                        },
                        options
                    ),
                    numPaused = 0;

                let sync = pouch
                    .sync(databases[localDB], databases[remoteDB], _options)
                    .on('paused', err => {
                        if (err) {
                            vm.$emit('pouchdb-sync-error', {
                                db: localDB,
                                error: err,
                            });
                            return;
                        }
                        numPaused += 1;
                        if (numPaused >= 2) {
                            vm.$emit('pouchdb-sync-paused', {
                                db: localDB,
                                paused: true,
                            });
                        }
                    })
                    .on('change', info => {
                        vm.$emit('pouchdb-sync-change', {
                            db: localDB,
                            info: info,
                        });
                    })
                    .on('active', () => {
                        vm.$emit('pouchdb-sync-active', {
                            db: localDB,
                            active: true,
                        });
                    })
                    .on('denied', err => {
                        vm.$emit('pouchdb-sync-denied', {
                            db: localDB,
                            error: err,
                        });
                    })
                    .on('complete', info => {
                        vm.$emit('pouchdb-sync-complete', {
                            db: localDB,
                            info: info,
                        });
                    })
                    .on('error', err => {
                        vm.$emit('pouchdb-sync-error', {
                            db: localDB,
                            error: err,
                        });
                    });

                fetchSession(databases[remoteDB]);

                return sync;
            },
            push(localDB, remoteDB, options = {}) {
                if (!databases[localDB]) {
                    makeInstance(localDB);
                }
                if (!databases[remoteDB]) {
                    makeInstance(remoteDB);
                }

                let numPaused = 0;

                let rep = databases[localDB].replicate
                    .to(databases[remoteDB], options)
                    .on('paused', err => {
                        if (err) {
                            vm.$emit('pouchdb-push-error', {
                                db: localDB,
                                error: err,
                            });
                            return;
                        }
                        numPaused += 1;
                        if (numPaused >= 2) {
                            vm.$emit('pouchdb-push-paused', {
                                db: localDB,
                                paused: true,
                            });
                        }
                    })
                    .on('change', info => {
                        vm.$emit('pouchdb-push-change', {
                            db: localDB,
                            info: info,
                        });
                    })
                    .on('active', () => {
                        vm.$emit('pouchdb-push-active', {
                            db: localDB,
                            active: true,
                        });
                    })
                    .on('denied', err => {
                        vm.$emit('pouchdb-push-denied', {
                            db: localDB,
                            error: err,
                        });
                    })
                    .on('complete', info => {
                        vm.$emit('pouchdb-push-complete', {
                            db: localDB,
                            info: info,
                        });
                    })
                    .on('error', err => {
                        vm.$emit('pouchdb-push-error', {
                            db: localDB,
                            error: err,
                        });
                    });

                fetchSession(databases[remoteDB]);

                return rep;
            },

            pull(localDB, remoteDB, options = {}) {
                if (!databases[localDB]) {
                    makeInstance(localDB);
                }
                if (!databases[remoteDB]) {
                    makeInstance(remoteDB);
                }

                let numPaused = 0;

                let rep = databases[localDB].replicate
                    .from(databases[remoteDB], options)
                    .on('paused', err => {
                        if (err) {
                            vm.$emit('pouchdb-pull-error', {
                                db: localDB,
                                error: err,
                            });
                            return;
                        }
                        numPaused += 1;
                        if (numPaused >= 2) {
                            vm.$emit('pouchdb-pull-paused', {
                                db: localDB,
                                paused: true,
                            });
                        }
                    })
                    .on('change', info => {
                        vm.$emit('pouchdb-pull-change', {
                            db: localDB,
                            info: info,
                        });
                    })
                    .on('active', () => {
                        vm.$emit('pouchdb-pull-active', {
                            db: localDB,
                            active: true,
                        });
                    })
                    .on('denied', err => {
                        vm.$emit('pouchdb-pull-denied', {
                            db: localDB,
                            error: err,
                        });
                    })
                    .on('complete', info => {
                        vm.$emit('pouchdb-pull-complete', {
                            db: localDB,
                            info: info,
                        });
                    })
                    .on('error', err => {
                        vm.$emit('pouchdb-pull-error', {
                            db: localDB,
                            error: err,
                        });
                    });

                fetchSession(databases[remoteDB]);

                return rep;
            },

            changes(db, options = {}) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                let _options = Object.assign(
                        {},
                        {
                            live: true,
                            retry: true,
                            back_off_function: delay => {
                                if (delay === 0) {
                                    return 1000;
                                }
                                return delay * 3;
                            },
                        },
                        options
                    ),
                    numPaused = 0;

                let changes = databases[db]
                    .changes(_options)
                    .on('change', info => {
                        vm.$emit('pouchdb-changes-change', {
                            db: db,
                            info: info,
                        });
                    })
                    .on('complete', info => {
                        vm.$emit('pouchdb-changes-complete', {
                            db: db,
                            info: info,
                        });
                    })
                    .on('error', err => {
                        vm.$emit('pouchdb-changes-error', {
                            db: db,
                            error: err,
                        });
                    });

                fetchSession(databases[db]);

                return changes;
            },

            get(db, object, options = {}) {
                if (!databases[db]) {
                    makeInstance(db);
                }
                return databases[db].get(object, options);
            },

            put(db, object, options = {}) {
                if (!databases[db]) {
                    makeInstance(db);
                }
                return databases[db].put(object, options);
            },

            post(db, object, options = {}) {
                if (!databases[db]) {
                    makeInstance(db);
                }
                return databases[db].post(object, options);
            },

            remove(db, object, options = {}) {
                if (!databases[db]) {
                    makeInstance(db);
                }
                return databases[db].remove(object, options);
            },

            query(db, fun, options = {}) {
                if (!databases[db]) {
                    makeInstance(db);
                }
                return databases[db].query(fun, options);
            },

            find(db, options) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].find(options);
            },

            createIndex(db, index) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].createIndex(index);
            },

            allDocs(db, options = {}) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                let _options = Object.assign(
                    {},
                    { include_docs: true },
                    options
                );

                return databases[db].allDocs(_options);
            },

            bulkDocs(db, docs, options = {}) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].bulkDocs(docs, options);
            },

            compact(db, options = {}) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].compact(options);
            },

            viewCleanup(db) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].viewCleanup();
            },

            info(db) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].info();
            },

            putAttachment(db, docId, rev, attachment) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].putAttachment(
                    docId,
                    attachment.id,
                    rev ? rev : null,
                    attachment.data,
                    attachment.type
                );
            },

            getAttachment(db, docId, attachmentId) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].getAttachment(docId, attachmentId);
            },

            deleteAttachment(db, docId, attachmentId, docRev) {
                if (!databases[db]) {
                    makeInstance(db);
                }

                return databases[db].removeAttachment(
                    docId,
                    attachmentId,
                    docRev
                );
            },
        };

        // add non reactive api
        vm.$pouch = $pouch;
        //add non reactive property
        vm.$databases = databases; // Add non-reactive property

        let pouchOptions = this.$options.pouch;

        if (!pouchOptions) {
            return;
        }

        if (typeof pouchOptions === 'function') {
            pouchOptions = pouchOptions();
        }

        Object.keys(pouchOptions).map(key => {
            let pouchFn = pouchOptions[key];
            if (typeof pouchFn !== 'function') {
                pouchFn = () => {
                    return pouchOptions[key];
                };
            }

            // if the selector changes, modify the liveFeed object
            //
            vm.$watch(
                pouchFn,
                config => {
                    // if the selector is now giving a value of null or undefined, then return
                    // the previous liveFeed object will remain
                    if (!config) {
                        vm.$emit('pouchdb-livefeed-error', {
                            db: key,
                            config: config,
                            error: 'Null or undefined selector',
                        });

                        return;
                    }


                    let selector, sort, skip, limit, first;

                    if (config.selector) {
                        selector = config.selector;
                        sort = config.sort;
                        skip = config.skip;
                        limit = config.limit;
                        first = config.first;
                    } else {
                        selector = config;
                    }

                    // the database could change in the config options
                    // so the key could point to a database of a different name
                    let databaseParam = config.database || key;
                    let db = null;

                    if (typeof databaseParam === 'object') {
                        db = databaseParam;
                    } else if (typeof databaseParam === 'string') {
                        if (!databases[databaseParam]) {
                            databases[databaseParam] = new pouch(
                                databaseParam
                            );
                            login(databases[databaseParam]);
                        }
                        db = databases[databaseParam];
                    }
                    if (!db) {
                        vm.$emit('pouchdb-livefeed-error', {
                            db: key,
                            error: 'Null or undefined database',
                        });
                        return;
                    }
                    if (vm._liveFeeds[key]) {
                        vm._liveFeeds[key].cancel();
                    }
                    let aggregateCache = [];

                    // the LiveFind plugin returns a liveFeed object
                    vm._liveFeeds[key] = db
                        .liveFind({
                            selector: selector,
                            sort: sort,
                            skip: skip,
                            limit: limit,
                            aggregate: true,
                        })
                        .on('update', (update, aggregate) => {
                            if (first && aggregate)
                                aggregate = aggregate[0];

                            vm.$data[key] = aggregateCache = aggregate;

                            vm.$emit('pouchdb-livefeed-update', {
                                db: key,
                                name: db.name,
                            });

                        })
                        .on('ready', () => {
                            vm.$data[key] = aggregateCache;

                            vm.$emit('pouchdb-livefeed-ready', {
                                db: key,
                                name: db.name,
                            });
                        })
                        .on('cancelled', function() {
                            vm.$emit('pouchdb-livefeed-cancel', {
                                db: key,
                                name: db.name,
                            });
                        })
                        .on('error', function(err) {
                            vm.$emit('pouchdb-livefeed-error', {
                                db: key,
                                name: db.name,
                                error: err,
                            });
                        });
                },
                {
                    immediate: true,
                }
            );
        });
    },
    // tear down the liveFeed objects
    beforeDestroy() {
        Object.keys(this._liveFeeds).map(lfKey => {
            this._liveFeeds[lfKey].cancel();
        });
    },
};

let api: PluginObject<PouchVueOptions> = {
    mixin: vuePouch,
    install: (Vue, options) => {
        vue = Vue;
        pouch = (options && options.pouch) || PouchDB;
        defaultDB = (options && options.defaultDB) || '';

        // In PouchDB v7.0.0 the debug() API was moved to a separate plugin.
        // var pouchdbDebug = require('pouchdb-debug');
        // PouchDB.plugin(pouchdbDebug);
        if (options && options.debug && options.debug === '*') {
            pouch.debug.enable(options.debug);
        }

        // include options for creating databases: https://pouchdb.com/api.html#create_database
        if (options && options.optionsDB) {
            optionsDB = options && options.optionsDB;
        }

        // mixin https://github.com/vuejs/vue/blob/dev/src/core/global-api/mixin.js
        Vue.options = Vue.util.mergeOptions(Vue.options, vuePouch);
    },
};

export default api;

