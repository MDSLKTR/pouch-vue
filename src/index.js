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
        /* Creates a property in 'data' with 'null' value for each pouch property
         * defined on the component.  This way the user does not have to manually
         * define a data property for the reactive databases/selectors.
         *
         * This partial 'data' object is mixed into the components along with
         * the rest of the API (but is empty unless the component has a 'pouch'
         * option).
         */
        data(vm) {
            let pouchOptions = vm.$options.pouch;
            if (typeof pouchOptions === 'undefined' || pouchOptions === null) return {};
            if (typeof pouchOptions === 'function') pouchOptions = pouchOptions(vm);
            return Object.keys(pouchOptions).reduce((accumulator, currentValue) => {
                accumulator[currentValue] = null;
                return accumulator
            }, {});
        },

        // lifecycle hooks for mixin

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
                makeInstance(defaultDB);
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

            function makeInstance(db, options = {}) {
                // Merge the plugin optionsDB options with those passed in
                // when creating pouch dbs.
                // Note: default opiontsDB options are passed in when creating 
                // both local and remote pouch databases. E.g. modifying fetch()
                // in the options is only useful for remote Dbs but will be passed
                // for local pouch dbs too if set in optionsDB.
                // See: https://pouchdb.com/api.html#create_database
            
                let _options = Object.assign(
                    {},
                    optionsDB,
                    options
                )

                databases[db] = new pouch(db, _options);
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
                    return fetchSession(databases[db]);
                },

                sync(localDB, remoteDB=defaultDB, options = {}) {
                    if (!databases[localDB]) {
                        makeInstance(localDB);
                    }
                    if (!databases[remoteDB]) {
                        makeInstance(remoteDB);
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
                    );

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
                            else {

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

                    return sync;
                },
                push(localDB, remoteDB=defaultDB, options = {}) {
                    if (!databases[localDB]) {
                        makeInstance(localDB);
                    }
                    if (!databases[remoteDB]) {
                        makeInstance(remoteDB);
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
                    );

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
                            else {
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

                    return rep;
                },

                pull(localDB, remoteDB=defaultDB, options = {}) {
                    if (!databases[localDB]) {
                        makeInstance(localDB);
                    }
                    if (!databases[remoteDB]) {
                        makeInstance(remoteDB);
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
                    );

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
                            else {
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
                    );

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
                                makeInstance(databaseParam);
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
        install: (Vue, options = {}) => {
            vue = Vue;

            ({ pouch = PouchDB, defaultDB = '', optionsDB = {} } = options);

            // In PouchDB v7.0.0 the debug() API was moved to a separate plugin.
            // var pouchdbDebug = require('pouchdb-debug');
            // PouchDB.plugin(pouchdbDebug);
            if (options.debug === '*') pouch.debug.enable('*');

            Vue.mixin(vuePouch);
        },
    };

    module.exports = api;
})();
