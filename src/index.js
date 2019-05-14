import { isRemote } from 'pouchdb-utils';

(function() {
    let vue = null,
        pouch = null,
        defaultDB = null,
        defaultUsername = null,
        defaultPassword = null,
        databases = {},
        optionsDB = {};

    let vuePouch = {
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
            this.$options.data= function(vm) {
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

            let vm = this;

            vm._liveFeeds = {};

            if (defaultDB) {
                databases[defaultDB] = new pouch(defaultDB, optionsDB);
                registerListeners(databases[defaultDB]);
            }

            function fetchSession(db = databases[defaultDB]) {
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

            function login(db = databases[defaultDB]) {
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

            function makeInstance(db, opts = {}) {
                databases[db] = new pouch(db, opts);
                registerListeners(databases[db]);
            }

            function registerListeners(db) {
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

            let $pouch = {
                version: '__VERSION__',
                connect(username, password, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return new Promise(resolve => {
                        defaultUsername = username;
                        defaultPassword = password;

                        if (!isRemote(databases[db])) {
                            resolve({
                                message: 'database is not remote',
                                error: 'bad request',
                                status: 400,
                            });
                            return;
                        }

                        login(databases[db]).then(res => {
                            resolve(res);
                        });
                    });
                },
                createUser(username, password, db = defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db]
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
                putUser(username, metadata = {}, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db]
                        .putUser(username, {
                            metadata,
                        })
                        .catch(error => {
                            return new Promise(resolve => {
                                resolve(error);
                            });
                        });
                },
                deleteUser(username, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db]
                        .deleteUser(username)
                        .catch(error => {
                            return new Promise(resolve => {
                                resolve(error);
                            });
                        });
                },
                changePassword(username, password, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db]
                        .changePassword(username, password)
                        .catch(error => {
                            return new Promise(resolve => {
                                resolve(error);
                            });
                        });
                },
                changeUsername(oldUsername, newUsername, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db]
                        .changeUsername(oldUsername, newUsername)
                        .catch(error => {
                            return new Promise(resolve => {
                                resolve(error);
                            });
                        });
                },
                signUpAdmin(adminUsername, adminPassword, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db]
                        .signUpAdmin(adminUsername, adminPassword)
                        .catch(error => {
                            return new Promise(resolve => {
                                resolve(error);
                            });
                        });
                },
                deleteAdmin(adminUsername, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db]
                        .deleteAdmin(adminUsername)
                        .catch(error => {
                            return new Promise(resolve => {
                                resolve(error);
                            });
                        });
                },
                disconnect(db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return new Promise(resolve => {
                        defaultUsername = null;
                        defaultPassword = null;

                        if (!isRemote(databases[db])) {
                            resolve({
                                message: 'database is not remote',
                                error: 'bad request',
                                status: 400,
                            });
                            return;
                        }

                        databases[db]
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

                destroy(db=defaultDB) {
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

                close(db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return databases[db].close().then(() => {
                        if (db !== defaultDB) {
                            delete databases[db];
                        }
                    });
                },

                getSession(db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    if (!isRemote(databases[db])) {
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

                sync(localDB, remoteDB=defaultDB, options = {}) {
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
                push(localDB, remoteDB=defaultDB, options = {}) {
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

                pull(localDB, remoteDB=defaultDB, options = {}) {
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

                changes(options = {}, db=defaultDB) {
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

                get(object, options = {}, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db].get(object, options);
                },

                put(object, options = {}, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db].put(object, options);
                },

                post(object, options = {}, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db].post(object, options);
                },

                remove(object, options = {}, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db].remove(object, options);
                },

                query(fun, options = {}, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }
                    return databases[db].query(fun, options);
                },

                find(options, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return databases[db].find(options);
                },

                createIndex(index, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return databases[db].createIndex(index);
                },

                allDocs(options = {}, db=defaultDB) {
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

                bulkDocs(docs, options = {}, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return databases[db].bulkDocs(docs, options);
                },

                compact(options = {}, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return databases[db].compact(options);
                },

                viewCleanup(db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return databases[db].viewCleanup();
                },

                info(db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return databases[db].info();
                },

                putAttachment(docId, rev, attachment, db=defaultDB) {
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

                getAttachment(docId, attachmentId, db=defaultDB) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return databases[db].getAttachment(docId, attachmentId);
                },

                deleteAttachment(docId, attachmentId, docRev, db=defaultDB) {
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

    let api = {
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

    module.exports = api;
})();
