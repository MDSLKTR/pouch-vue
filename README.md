# Pouch Vue

##### Basic structure copied from https://github.com/buhrmi/vue-pouch with a lot of api changes though

## Installation
Install via npm:
```
    npm install --save pouch-vue
```

The only requirement is that `pouchdb-live-find` is installed:
```
    import PouchDB from 'pouchdb-browser'
    PouchDB.plugin(require('pouchdb-find'));
    PouchDB.plugin(require('pouchdb-live-find'));
```

If you want to use remote databases (CouchDB, Cloudant, etc.), you should also install the authentication plugin:
```
    PouchDB.plugin(require('pouchdb-authentication'));
```
Then, plug VuePouch into Vue:
    import PouchVue from 'pouchVue';
```
    Vue.use(pouchVue, {
      pouch: PouchDB,    // optional if `PouchDB` is available on the global object
      defaultDB: 'removeDbName'  // this is used as a default connect/disconnect database
      debug: '*' // optional - See `https://pouchdb.com/api.html#debug_mode` for valid settings
    });
```

## API

### $pouch

`$pouch` is made available on all vue instances and implements most of pouchdbs current API (https://pouchdb.com/api.html).
Default events are mounted on each db you connect to: https://pouchdb.com/api.html#events. When a database is created `pouchdb-db-created` is emitted and `pouchdb-db-destroyed` when it's destroyed.

#### Methods
All Methods return a promise and mirror or extend the API from pouchdb.

* `$pouch.getSession()`: Returns the current session if already logged in to the defaultDB.
* `$pouch.connect(username, password)`: Connects you to the defaultDB and returns the user object on success.
* `$pouch.disconnect()`: Disconnects you from the defaultDB and clears the session data.
* `$pouch.createUser(name, password)`: Creates a user in the remote database and starts a new session.
___
* `$pouch.destroy(db)`: same as https://pouchdb.com/api.html#delete_database
* `$pouch.defaults(options)`: same as https://pouchdb.com/api.html#defaults
___
* `$pouch.sync(localDatabase, remoteDatabase, options)`: Basically the same as PouchDB.sync(local, remote, {live: true, retry: true}). Also, if the browser has an active session cookie, it will fetch session data (username, etc) from the remote server. **BONUS:** If your remote database runs CouchDB 2.0 or higher, you can also specify a Mango Selector that is used to filter documents coming from the remote server. Callback functions will be invoked with the name `pouchdb-[method]-[type]`. So in this case you can use `this.$on('pouchdb-sync-change', callback(data))` to listen when a change occurs. See https://pouchdb.com/api.html#sync for a full list of events you can use.

**default options (will be merged with the options passed in)**:
 ```
{
    live: true,
    retry: true,
    back_off_function: (delay) => {
        if (delay === 0) {
            return 1000;
        }
        return delay * 3;
    },
}
```
**For example:**
```
    $pouch.sync('complaints', 'https:/42.233.1.44/complaints', {
      filter:'_selector',
      selector: {
        type: 'complaint',
        assignee: this.session.name
      }
    });

```
* `$pouch.push(localDatabase, remoteDatabase, options)`: Like https://pouchdb.com/api.html#replication - replicate-to. Also, if the browser has an active session cookie, it will fetch session data (username, etc) from the remote server.
* `$pouch.pull(localDatabase, remoteDatabase, options)`: Like https://pouchdb.com/api.html#replication - replicate-from. Also, if the browser has an active session cookie, it will fetch session data (username, etc) from the remote server.
* `$pouch.changes(database, options)`: Listens for change on a db like: https://pouchdb.com/api.html#changes
* `$pouch.put/post/remove/get(database, ...)`: Same as db.put/post/remove/get(...) https://pouchdb.com/api.html#create_document
* `$pouch.query(db, 'map/reduce function', options)`: like https://pouchdb.com/api.html#query_database
* `$pouch.allDocs(db, options)`: like https://pouchdb.com/api.html#batch_fetch but `include_docs` is set to true by default. You can however overwrite it of course.
* `$pouch.bulkDocs(db, options)`: https://pouchdb.com/api.html#batch_create
* `$pouch.compact(db, options)`: https://pouchdb.com/api.html#compaction
* `$pouch.viewCleanup(db)`: https://pouchdb.com/api.html#view_cleanup
* `$pouch.info(db)`: like https://pouchdb.com/api.html#database_information
* `$pouch.putAttachment(db, docId, [rev], attachmentObject(id,data,type)`: like https://pouchdb.com/api.html#save_attachment
* `$pouch.getAttachment(db, docId, attachmentId)`: like https://pouchdb.com/api.html#get_attachment
* `$pouch.deleteAttachment(db, docId, attachmentId, docRev)`: like https://pouchdb.com/api.html#delete_attachment
* `$pouch.close(db)`: https://pouchdb.com/api.html#close_database

#### Non-Reactive Properties
* `vm.$databases`: the pouchdb instances which are shared across all components.

## Examples

```vue
<template>
  <div class="todos">
    <input v-model="message" placeholder="New Todo">
    <button @click="$pouch.post('todos', {message: message});message=''">Save Todo</button>
    <div v-for="todo in todos">
      <input v-model="todo.message" @change="$pouch.put('todos', todo)">
      <button @click="$pouch.remove('todos', todo)">Remove</button>
    </div>
  </div>
</template>

<script>
  export default {
    // VuePouch adds a `pouch` config option to all components.
    pouch: {
      // The simplest usage. queries all documents from the "todos" pouch database and assigns them to the "todos" vue property.
      todos: {/*empty selector*/}
    },
    created: function() {
      // Send all documents to the remote database, and stream changes in real-time. Note if you use filters you need to set them correctly for pouchdb and couchdb. You can set them for each direction separatly: options.push/options.pull. PouchDB might not need the same filter to push documents as couchdb to send the filtered requested documents.
      this.$pouch.sync('todos', 'http://localhost:5984/todos', options);
    }
  }
</script>
```

### Reactive & Live Selectors (Mango Queries)

```vue
<template>
  Show people that are <input v-model="age"> years old.
  <div v-for="person in people">
    {{ person.name }}
  </div>
</template>

<script>
  export default {
    data () {
      return {
        resultsPerPage: 25,
        currentPage: 1
      }
    },
    // Use the pouch property to configure the component to (reactively) read data from pouchdb.
    pouch: {
      // The function returns a Mango-like selector that is run against the `people` database.
      // The result of the query is assigned to the `people` property.
      people() {
        if (!this.age) return;
        return {age: this.age, type: "person"}
      },
      // You can also specify the database dynamically (local or remote), as well as limits, skip and sort order:
      peopleInOtherDatabase() {
        return {
          database: this.selectedDatabase, // you can pass a database string or a pouchdb instance
          selector: {type: "person"},
          sort: [{name: "asc"}],
          limit: this.resultsPerPage,
          skip: this.resultsPerPage * (this.currentPage - 1)
        }
      }
    }
  })
</script>
```

### Single documents

If you only want to sync a single document that matches a selector, use `first: true`:

```vue
module.exports = {
  // ...
  pouch: {
    projectDetails() {
      return {
        database: 'mydatabase',
        selector: {_id: this.selectedProjectId},
        first: true
      }
    }
  }
  // ...
}
```

### User Authentication

```vue
 this.$pouch.connect(this.credentials.username, this.credentials.password)
    .then((res) => {
        let isUnauthorized = res.error === 'unauthorized',
            isOffline = res.status === 0;

                if (isOffline) {
                    return;
                }

                if (isUnauthorized) {
                    return;
                }
                this.$router.push('/dashboard');
    })
    .catch((error) => {
        console.error(error);
    });
```

### Handle Sessions
```
this.$pouch.getSession().then((data) => {
    if (data.status === 0) {
        this.$router.push('/login');
            console.log('most likely offline');
            return;
        }

        if (!data.user || !data.hasAccess) {
            this.$router.push('/login');
            return;
        }

        this.$store.commit('UPDATE_SESSION', data);
});
```
