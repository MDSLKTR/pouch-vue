(function () {
    let vue = null,
        pouch = null,
        defaultDB = null,
        defaultUsername = null,
        defaultPassword = null,
        databases = {};

    let vuePouch = {
        beforeDestroy() {
            Object.values(this._liveFinds).map((lf) => {
                lf.cancel();
            });
        },
        created() {
            if (!vue) {
                console.warn('[vue-pouch-adapter] not installed!');
                return;
            }
            let defineReactive = vue.util.defineReactive;
            let vm = this;
            vm._liveFinds = {};

            if (defaultDB) {
                databases[defaultDB] = new pouch(defaultDB);
            }

            function fetchSession() {
                return new Promise((resolve) => {
                    databases[defaultDB].getSession().then((session) => {
                        console.log(session);
                        databases[defaultDB].getUser(session.userCtx.name)
                            .then((userData) => {
                                let userObj = Object.assign({}, session.userCtx, { displayName: userData.displayname });
                                resolve({
                                    user: userObj,
                                    hasAccess: true,
                                });
                            }).catch((error) => {
                                resolve(error);
                            });
                    }).catch((error) => {
                        resolve(error);
                    });
                });
            }

            function login() {
                return new Promise((resolve) => {
                    databases[defaultDB].login(defaultUsername, defaultPassword)
                        .then((user) => {
                            databases[defaultDB].getUser(user.name)
                                .then((userData) => {
                                    let userObj = Object.assign({}, user, { displayName: userData.displayname });
                                    resolve({
                                        user: userObj,
                                        hasAccess: true,
                                    });
                                }).catch((error) => {
                                    resolve(error);
                                });
                        })
                        .catch((error) => {
                            resolve(error);
                        });
                });
            }

            function addDB(db) {
                databases[db] = new pouch(db);
            }

            let $pouch = {
                version: '__VERSION__',
                connect(username, password) {
                    return new Promise((resolve) => {
                        defaultUsername = username;
                        defaultPassword = password;

                        if (!databases[defaultDB]._remote) {
                            resolve({
                                message: 'database is not remote',
                                error: 'bad request',
                                status: 400,
                            });
                            return;
                        }

                        login().then((res) => {
                            resolve(res);
                        });
                    });
                },
                createUser(username, password) {
                    return databases[defaultDB].signup(username, password).then(() => {
                        return vm.$pouch.connect(username, password);
                    }).catch((error) => {
                        return new Promise((resolve) => {
                            resolve(error);
                        });
                    });
                },
                disconnect() {
                    return new Promise((resolve) => {
                        defaultUsername = null;
                        defaultPassword = null;

                        if (!databases[defaultDB]._remote) {
                            resolve({
                                message: 'database is not remote',
                                error: 'bad request',
                                status: 400,
                            });
                            return;
                        }

                        databases[defaultDB].logout()
                            .then((res) => {
                                resolve({
                                    ok: res.ok,
                                    user: null,
                                    hasAccess: false,
                                });
                            }).catch((error) => {
                                resolve(error);
                            });
                    });
                },

                getSession() {
                    if (!databases[defaultDB]._remote) {
                        return new Promise((resolve) => {
                            resolve({
                                message: 'database is not remote',
                                error: 'bad request',
                                status: 400,
                            });
                        });
                    }
                    return fetchSession();
                },

                cancelSync(sync) {
                    sync.cancel();
                },

                sync(localDB, remoteDB, _options) {
                    if (!databases[localDB]) {
                        databases[localDB] = new pouch(localDB);
                    }
                    if (!databases[remoteDB]) {
                        databases[remoteDB] = new pouch(remoteDB);
                    }
                    if (!defaultDB) {
                        defaultDB = databases[remoteDB];
                    }

                    let options = Object.assign({}, _options,
                        {
                            live: true,
                            retry: true,
                            back_off_function: (delay) => {
                                if (delay === 0) {
                                    return 1000;
                                }
                                return delay * 3;
                            }
                        }),
                        numPaused = 0;

                    let sync = pouch.sync(databases[localDB], databases[remoteDB], options)
                        .on('paused', (err) => {
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
                        .on('change', (info) => {
                            vm.$emit('pouchdb-sync-change', {
                                db: localDB,
                                info: info,
                            });
                        })
                        .on('active', () => {
                            vm.$emit('pouchdb-sync-active', {
                                db: localDB,
                                paused: true,
                            });
                        })
                        .on('denied', (err) => {
                            vm.$emit('pouchdb-sync-denied', {
                                db: localDB,
                                error: err,
                            });
                        })
                        .on('complete', (info) => {
                            vm.$emit('pouchdb-sync-complete', {
                                db: localDB,
                                info: info,
                            });
                        })
                        .on('error', (err) => {
                            vm.$emit('pouchdb-sync-error', {
                                db: localDB,
                                error: err,
                            });
                        });

                    fetchSession(databases[remoteDB]);

                    return sync;
                },
                push(localDB, remoteDB, options) {
                    if (!databases[localDB]) {
                        databases[localDB] = new pouch(localDB);
                    }
                    if (!databases[remoteDB]) {
                        databases[remoteDB] = new pouch(remoteDB);
                    }

                    databases[localDB].replicate.to(databases[remoteDB], options)
                        .on('paused', (err) => {
                            vm.$emit('pouchdb-push-error', err);
                        })
                        .on('change', (info) => {
                            vm.$emit('pouchdb-push-change', info);
                        })
                        .on('active', () => {
                            vm.$emit('pouchdb-push-active', true);
                        })
                        .on('denied', (err) => {
                            vm.$emit('pouchdb-push-denied', err);
                        })
                        .on('complete', (info) => {
                            vm.$emit('pouchdb-push-complete', info);
                        })
                        .on('error', (err) => {
                            vm.$emit('pouchdb-push-error', err);
                        });

                    fetchSession(databases[remoteDB]);
                },
                put(db, object, options) {
                    if (!databases[db]) {
                        addDB(db);
                    }
                    return databases[db].put(object, options ? options : {});
                },
                post(db, object, options) {
                    if (!databases[db]) {
                        addDB(db);
                    }
                    return databases[db].post(object, options ? options : {});
                },
                remove(db, object, options) {
                    if (!databases[db]) {
                        addDB(db);
                    }
                    return databases[db].remove(object, options ? options : {});
                },
                query(db, options) {
                    if (!databases[db]) {
                        addDB(db);
                    }
                    return databases[db].query(options ? options : {});
                },
                allDocs(db, options) {
                    if (!databases[db]) {
                        addDB(db);
                    }
                    return databases[db].allDocs(options ? options : {});
                },

                get(db, object, options) {
                    if (!databases[db]) {
                        addDB(db);
                    }
                    return databases[db].get(object, options ? options : {});
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
            Object.keys(pouchOptions).map((key) => {
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
                vm.$watch(pouchFn, (config) => {
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
                            databases[databaseParam] = new pouch(databaseParam);
                            login(databases[databaseParam]);
                        }
                        db = databases[databaseParam];
                    }
                    if (!db) {
                        return;
                    }
                    if (vm._liveFinds[key]) {
                        vm._liveFinds[key].cancel();
                    }
                    let aggregateCache = [];
                    vm._liveFinds[key] = db.liveFind({
                        selector: selector,
                        sort: sort,
                        skip: skip,
                        limit: limit,
                        aggregate: true,
                    }).on('update', (update, aggregate) => {
                        if (first && aggregate) aggregate = aggregate[0];
                        vm[key] = aggregateCache = aggregate;
                    }).on('ready', () => {
                        vm[key] = aggregateCache;
                    });
                }, {
                        immediate: true,
                    });
            });
        },
    };

    function installSelectorReplicationPlugin() {
        // This plugin enables selector-based replication
        pouch.plugin((pouch) => {
            let oldReplicate = pouch.replicate;
            pouch.replicate = (source, target, repOptions) => {
                let sourceAjax = source._ajax;
                source._ajax = (ajaxOps, callback) => {
                    if (ajaxOps.url.includes('_selector')) {
                        ajaxOps.url = ajaxOps.url.replace('filter=_selector%2F_selector', 'filter=_selector');
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
            defaultDB = (options && options.defaultDB);
            Vue.options = Vue.util.mergeOptions(Vue.options, vuePouch);
        },
    };

    module.exports = api;
})();
