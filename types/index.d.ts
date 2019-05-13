/// <reference types="pouchdb-live-find" />
/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-authentication" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
/// <reference types="node" />
import _Vue, { PluginObject } from 'vue';
declare type PouchDatabases = Record<string, PouchDB.Database>;
interface PouchVueOptions {
    pouch: PouchDB.Static;
    defaultDB: string;
    debug: string;
    optionsDB: any;
}
interface PouchAPI {
    version: string;
    connect(username: string, password: string, db?: string): Promise<any>;
    createUser(username: string, password: string, db?: string): Promise<any>;
    putUser(username: string, metadata?: {}, db?: string): Promise<{} | PouchDB.Core.Response>;
    deleteUser(username: string, db?: string): Promise<{} | PouchDB.Core.Response>;
    changePassword(username: string, password: string, db?: string): Promise<{} | PouchDB.Core.Response>;
    changeUsername(oldUsername: string, newUsername: string, db?: string): Promise<{} | PouchDB.Core.Response>;
    signUpAdmin(adminUsername: string, adminPassword: string, db?: string): Promise<string | {}>;
    deleteAdmin(adminUsername: string, db?: string): Promise<string | {}>;
    disconnect(db?: string): void;
    destroy(db?: string): void;
    defaults(options?: PouchDB.Configuration.DatabaseConfiguration): void;
    close(db?: string): Promise<void>;
    getSession(db?: string): Promise<{}>;
    sync(localDB: string, remoteDB?: string, options?: {}): PouchDB.Replication.Sync<{}>;
    push(localDB: string, remoteDB?: string, options?: {}): PouchDB.Replication.Replication<{}>;
    pull(localDB: string, remoteDB?: string, options?: {}): PouchDB.Replication.Replication<{}>;
    changes(db?: string, options?: {}): PouchDB.Core.Changes<{}>;
    get(db?: string, object: any, options?: PouchDB.Core.GetOptions): Promise<any>;
    put(db?: string, object: any, options?: PouchDB.Core.PutOptions): Promise<PouchDB.Core.Response>;
    post(db?: string, object: any, options?: PouchDB.Core.Options): Promise<PouchDB.Core.Response>;
    remove(db?: string, object: any, options?: PouchDB.Core.Options): Promise<PouchDB.Core.Response>;
    query(db?: string, fun: any, options?: PouchDB.Query.Options<{}, {}>): Promise<PouchDB.Query.Response<{}>>;
    find(db?: string, options?: PouchDB.Find.FindRequest<{}>): Promise<PouchDB.Find.FindResponse<{}>>;
    createIndex(db?: string, index?: PouchDB.Find.CreateIndexOptions): Promise<PouchDB.Find.CreateIndexResponse<{}>>;
    allDocs(db?: string, options?: PouchDB.Core.AllDocsWithKeyOptions | PouchDB.Core.AllDocsWithKeysOptions | PouchDB.Core.AllDocsWithinRangeOptions | PouchDB.Core.AllDocsOptions): Promise<PouchDB.Core.AllDocsResponse<{}>>;
    bulkDocs(db?: string, docs: PouchDB.Core.PutDocument<{}>[], options?: PouchDB.Core.BulkDocsOptions): Promise<(PouchDB.Core.Response | PouchDB.Core.Error)[]>;
    compact(db?: string, options?: PouchDB.Core.CompactOptions): Promise<PouchDB.Core.Response>;
    viewCleanup(db?: string): Promise<PouchDB.Core.BasicResponse>;
    info(db?: string): Promise<PouchDB.Core.DatabaseInfo>;
    putAttachment(db?: string, docId: PouchDB.Core.DocumentId, rev: string, attachment: {
        id: string;
        data: PouchDB.Core.AttachmentData;
        type: string;
    }): Promise<PouchDB.Core.Response>;
    getAttachment(db?: string, docId: PouchDB.Core.DocumentId, attachmentId: PouchDB.Core.AttachmentId): Promise<Blob | Buffer>;
    deleteAttachment(db?: string, docId: PouchDB.Core.DocumentId, attachmentId: PouchDB.Core.AttachmentId, docRev: PouchDB.Core.RevisionId): Promise<PouchDB.Core.RemoveAttachmentResponse>;
}
declare module 'vue/types/vue' {
    interface VueConstructor {
        util: {
            mergeOptions(parent: Object, child: Object, vm?: any): Object;
        };
        options: any;
    }
    interface Vue {
        $pouch: PouchAPI;
        $databases: PouchDatabases;
        _liveFeeds: Record<string, PouchDB.LiveFind.LiveFeed>;
        options: any;
    }
}
declare module 'vue/types/options' {
    interface ComponentOptions<V extends _Vue> {
        pouch?: any;
    }
}
declare let api: PluginObject<PouchVueOptions>;
export default api;
