(function() {
    var vue = null;
    var pouch = null;
    var defaultDB = null;
    var defaultUsername = null;
    var defaultPassword = null;
    var databases = {};

    var vuePouch = {
        destroyed: function() {
            Object.values(this._liveFinds).map(function(lf) {
                lf.cancel();
            });
        },
        created: function() {
            if (!vue) {
                console.warn('[vue-pouch] not installed!');
                return;
            }
            var defineReactive = vue.util.defineReactive;
            var vm = this;
            vm._liveFinds = {};

            function fetchSession(database) {
                return new Promise(function(resolve) {
                    database.getSession().then(function(session) {
                        return database.getUser(session.userCtx.name)
                            .then(function() {
                                resolve({
                                    user: session.userCtx,
                                    hasAccess: true,
                                });
                            }).catch(function(error) {
                                resolve(error);
                            });
                    }).catch(function(error) {
                        resolve(error);
                    });
                });
            }

            function login(database) {
                return new Promise(function(resolve) {
                    database.login(defaultUsername, defaultPassword)
                        .then(function(session) {
                            return database.getUser(session.userCtx.name)
                                .then(function() {
                                    resolve({
                                        user: session.userCtx,
                                        hasAccess: true,
                                    });
                                }).catch(function(error) {
                                    resolve(error);
                                });
                        })
                        .catch(function(error) {
                            resolve(error);
                        });
                });
            }

            var $pouch = {
                authenticate: function(username, password) {
                    return new Promise(function(resolve) {
                        defaultUsername = username;
                        defaultPassword = password;
                        Promise.all(Object.keys(databases)
                            .filter(function(database) {
                                return databases[database]._remote;
                            })
                            .map(function(database) {
                                return login(databases[database]);
                            })).then(function(res) {
                                resolve(res);
                            });
                    });
                },
                createUser: function(username, password) {
                    return defaultDB.signup(username, password).then(function() {
                        return vm.$pouch.authenticate(username, password);
                    }).catch(function(error) {
                        return new Promise(function(resolve) {
                            resolve(error);
                        });
                    });
                },
                disconnect: function() {
                    return new Promise((resolve) => {
                        defaultUsername = null;
                        defaultPassword = null;
                        var defaultDB = new pouch(defaultDB);
                        if (!defaultDB._remote) {
                            return defaultDB.logout().then(function() {
                                resolve();
                            });
                        }

                        return resolve();
                    });

                },
                preconnect: function(remoteDBs) {
                    remoteDBs.forEach(function(remoteDB) {
                        databases[remoteDB] = new pouch(remoteDB);
                    });
                },

                getSession: function() {
                    var defaultDB = new pouch(defaultDB);
                    if (!defaultDB._remote) {
                        return new Promise(function(resolve) {
                            resolve(true);
                        });
                    }
                    return fetchSession(defaultDB);
                },

                sync: function(localDB, remoteDB, _options) {
                    if (!databases[localDB]) databases[localDB] = new pouch(localDB);
                    if (!databases[remoteDB]) databases[remoteDB] = new pouch(remoteDB);
                    if (!defaultDB) defaultDB = databases[remoteDB];
                    var options = Object.assign({}, _options, {live: true, retry: true}),
                        numPaused = 0;
                    vm.$pouch.loading[localDB] = true;
                    pouch.sync(databases[localDB], databases[remoteDB], options)
                        .on('paused', function(err) {
                            if (err) {
                                vm.$pouch.errors[localDB] = err;
                                vm.$pouch.errors = Object.assign({}, vm.$pouch.errors);
                                return;
                            }
                            numPaused += 1;
                            if (numPaused >= 2) {
                                vm.$pouch.loading[localDB] = false;
                                vm.$pouch.loading = Object.assign({}, vm.$pouch.loading);
                            }
                        })
                        .on('active', function() {
                            console.log('active callback');
                        })
                        .on('denied', function(err) {
                            vm.$pouch.errors[localDB] = err;
                            vm.$pouch.errors = Object.assign({}, vm.$pouch.errors);
                            console.log('denied callback');
                        })
                        .on('complete', function(info) {
                            console.log('complete callback');
                        })
                        .on('error', function(err) {
                            vm.$pouch.errors[localDB] = err;
                            vm.$pouch.errors = Object.assign({}, vm.$pouch.errors);
                        });

                    fetchSession(databases[remoteDB]);
                },
                push: function(localDB, remoteDB, options) {
                    if (!databases[localDB]) databases[localDB] = new pouch(localDB);
                    if (!databases[remoteDB]) databases[remoteDB] = new pouch(remoteDB);
                    if (!defaultDB) defaultDB = databases[remoteDB];
                    databases[localDB].replicate.to(databases[remoteDB], options)
                        .on('paused', function(err) {
                            // console.log('paused callback')
                        })
                        .on('active', function() {
                            // console.log('active callback')
                        })
                        .on('denied', function(err) {
                            vm.$pouch.errors[localDB] = err;
                            vm.$pouch.errors = Object.assign({}, vm.$pouch.errors);
                            // console.log('denied callback')
                        })
                        .on('complete', function(info) {
                            // console.log('complete callback')
                        })
                        .on('error', function(err) {
                            vm.$pouch.errors[localDB] = err;
                            vm.$pouch.errors = Object.assign({}, vm.$pouch.errors);
                            // console.log('error callback')
                        });

                    fetchSession(databases[remoteDB]);
                },
                put: function(db, object, options) {
                    return databases[db].put(object, options);
                },
                post: function(db, object, options) {
                    return databases[db].post(object, options);
                },
                remove: function(db, object, options) {
                    return databases[db].remove(object, options);
                },
                query: function(db, options) {
                    return databases[db].query(options ? options : {}).then(function(res) {
                        return res;
                    });
                },
                allDocs: function(db, options) {
                    return databases[db].allDocs(options ? options : {}).then(function(res) {
                        return res;
                    });
                },

                get: function(db, object, options) {
                    return databases[db].get(object, options ? options : {}).then(function(res) {
                        return res;
                    });
                },
                errors: {},
                loading: {},
            };

            defineReactive(vm, '$pouch', $pouch);
            vm.$databases = databases; // Add non-reactive property

            var pouchOptions = this.$options.pouch;
            if (!pouchOptions) {
                return;
            }

            if (typeof pouchOptions === 'function') {
                pouchOptions = pouchOptions();
            }
            Object.keys(pouchOptions).map(function(key) {
                var pouchFn = pouchOptions[key];
                if (typeof pouchFn !== 'function') {
                    pouchFn = function() {
                        return pouchOptions[key];
                    };
                }
                if (typeof vm.$data[key] === 'undefined') vm.$data[key] = null;
                defineReactive(vm, key, null);
                vm.$watch(pouchFn, function(config) {
                    if (!config) {
                        if (!vm[key]) vm[key] = [];
                        return;
                    }
                    var selector, sort, skip, limit, first;
                    if (config.selector) {
                        selector = config.selector;
                        sort = config.sort;
                        skip = config.skip;
                        limit = config.limit;
                        first = config.first;
                    } else {
                        selector = config;
                    }

                    var databaseParam = config.database || key;
                    var db = null;
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
                    var aggregateCache = [];
                    vm._liveFinds[key] = db.liveFind({
                        selector: selector,
                        sort: sort,
                        skip: skip,
                        limit: limit,
                        aggregate: true,
                    }).on('update', function(update, aggregate) {
                        if (first && aggregate) aggregate = aggregate[0];
                        vm[key] = aggregateCache = aggregate;
                    }).on('ready', function() {
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
        pouch.plugin(function(pouch) {
            var oldReplicate = pouch.replicate;
            pouch.replicate = function(source, target, repOptions) {
                var sourceAjax = source._ajax;
                source._ajax = function(ajaxOps, callback) {
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

    var api = {
        mixin: vuePouch,
        install: function(Vue, options) {
            vue = Vue;
            pouch = (options && options.pouch) || PouchDB;
            installSelectorReplicationPlugin();
            defaultDB = (options && options.defaultDB);
            Vue.options = Vue.util.mergeOptions(Vue.options, vuePouch);
        },
    };

    if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = api;
    } else if (typeof define === 'function' && define.amd) {
        define(function() {
            return api;
        });
    } else if (typeof window !== 'undefined') {
        window.VuePouch = api;
    }
})();
