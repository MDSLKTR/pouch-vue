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
        beforeDestroy() {
            Object.values(this._liveFeeds).map(lf => {
                lf.cancel();
            });
        },
        created() {
            if (!vue) {
                console.warn('pouch-vue not installed!');
                return;
            }

            let defineReactive = vue.util.defineReactive,
                vm = this;

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
                        .login(defaultUsername, defaultPassword)
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
                connect(username, password, db = databases[defaultDB]) {
                    return new Promise(resolve => {
                        defaultUsername = username;
                        defaultPassword = password;

                        if (!db._remote) {
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
                        .signup(username, password)
                        .then(() => {
                            return vm.$pouch.connect(username, password, db);
                        })
                        .catch(error => {
                            return new Promise(resolve => {
                                resolve(error);
                            });
                        });
                },
                putUser (username, metadata = {}, db = databases[ defaultDB ]) {
                    return db
                        .putUser(username, {
                            metadata
                        })
                        .then(() => {
                            return vm.$pouch.putUser(username, metadata, db);
                        })
                        .catch(error => {
                            return new Promise(resolve => {
                                resolve(error);
                            });
                        });
                },
                deleteUser (username, db = databases[ defaultDB ]) {
                    return db
                        .deleteUser(username)
                        .then(() => {
                            return vm.$pouch.deleteUser(username, db);
                        })
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

                        if (!db._remote) {
                            resolve({
                                message: 'database is not remote',
                                error: 'bad request',
                                status: 400,
                            });
                            return;
                        }

                        db
                            .logout()
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

                destroy(db = databases[defaultDB]) {
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

                close(db = databases[defaultDB]) {
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
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    if (!db._remote) {
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

                sync(localDB, remoteDB, options) {
                    if (!databases[localDB]) {
                        makeInstance(localDB);
                    }
                    if (!databases[remoteDB]) {
                        makeInstance(remoteDB, optionsDB);
                    }
                    if (!defaultDB) {
                        defaultDB = databases[remoteDB];
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

                    let changes = db
                        .changes(_options)
                        .on('paused', err => {
                            if (err) {
                                vm.$emit('pouchdb-changes-error', {
                                    db: localDB,
                                    error: err,
                                });
                                return;
                            }
                            numPaused += 1;
                            if (numPaused >= 2) {
                                vm.$emit('pouchdb-changes-paused', {
                                    db: localDB,
                                    paused: true,
                                });
                            }
                        })
                        .on('change', info => {
                            vm.$emit('pouchdb-changes-change', {
                                db: localDB,
                                info: info,
                            });
                        })
                        .on('active', () => {
                            vm.$emit('pouchdb-changes-active', {
                                db: localDB,
                                active: true,
                            });
                        })
                        .on('denied', err => {
                            vm.$emit('pouchdb-changes-denied', {
                                db: localDB,
                                error: err,
                            });
                        })
                        .on('complete', info => {
                            vm.$emit('pouchdb-changes-complete', {
                                db: localDB,
                                info: info,
                            });
                        })
                        .on('error', err => {
                            vm.$emit('pouchdb-changes-error', {
                                db: localDB,
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

                find(db, options = {}) {
                    if (!databases[db]) {
                        makeInstance(db);
                    }

                    return databases[db].find(options);
                },

                createIndex(db, index = {}) {
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

            defineReactive(vm, '$pouch', $pouch);

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

                if (typeof vm.$data[key] === 'undefined') {
                    vm.$data[key] = null;
                }

                defineReactive(vm, key, null);
                vm.$watch(
                    pouchFn,
                    config => {
                        if (!config) {
                            if (!vm[key]) vm[key] = [];
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
                                vm[key] = aggregateCache = aggregate;
                            })
                            .on('ready', () => {
                                vm[key] = aggregateCache;
                            });
                    },
                    {
                        immediate: true,
                    }
                );
            });
        },
    };

    function installSelectorReplicationPlugin() {
        // This plugin enables selector-based replication
        pouch.plugin(pouch => {
            let oldReplicate = pouch.replicate;
            pouch.replicate = (source, target, repOptions) => {
                let sourceAjax = source._ajax;
                source._ajax = (ajaxOps, callback) => {
                    if (ajaxOps.url.includes('_selector')) {
                        ajaxOps.url = ajaxOps.url.replace(
                            'filter=_selector%2F_selector',
                            'filter=_selector'
                        );
                        ajaxOps.method = 'POST';
                        ajaxOps.body = {
                            selector: repOptions.selector,
                        };
                    }
                    return sourceAjax(ajaxOps, callback);
                };
                return oldReplicate(source, target, repOptions);
            };
        });
    }

    let api = {
        mixin: vuePouch,
        install: (Vue, options) => {
            vue = Vue;
            pouch = (options && options.pouch) || PouchDB;
            installSelectorReplicationPlugin();
            defaultDB = options && options.defaultDB;

            if (options.debug) {
                pouch.debug.enable(options.debug);
            }

            // include options for creating databases: https://pouchdb.com/api.html#create_database
            if (options.optionsDB) {
                optionsDB = options && options.optionsDB;
            }

            Vue.options = Vue.util.mergeOptions(Vue.options, vuePouch);
        },
    };

    module.exports = api;
})();
