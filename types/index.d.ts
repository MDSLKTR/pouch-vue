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
    defaults(options: PouchDB.Configuration.DatabaseConfiguration): void;
    close(db?: string): Promise<void>;
    getSession(db?: string): Promise<{}>;
    sync(localDB: string, remoteDB?: string, options?: {}): PouchDB.Replication.Sync<{}>;
    push(localDB: string, remoteDB?: string, options?: {}): PouchDB.Replication.Replication<{}>;
    pull(localDB: string, remoteDB?: string, options?: {}): PouchDB.Replication.Replication<{}>;
    changes(options?: {}, db?: string): PouchDB.Core.Changes<{}>;
    get(object: any, options?: PouchDB.Core.GetOptions, db?: string): Promise<any>;
    put(object: any, options?: PouchDB.Core.PutOptions, db?: string): Promise<PouchDB.Core.Response>;
    post(object: any, options?: PouchDB.Core.Options, db?: string): Promise<PouchDB.Core.Response>;
    remove(object: any, options?: PouchDB.Core.Options, db?: string): Promise<PouchDB.Core.Response>;
    query(fun: any, options?: PouchDB.Query.Options<{}, {}>, db?: string): Promise<PouchDB.Query.Response<{}>>;
    find(options: PouchDB.Find.FindRequest<{}>, db?: string): Promise<PouchDB.Find.FindResponse<{}>>;
    createIndex(index: PouchDB.Find.CreateIndexOptions, db?: string): Promise<PouchDB.Find.CreateIndexResponse<{}>>;
    allDocs(options?: PouchDB.Core.AllDocsWithKeyOptions | PouchDB.Core.AllDocsWithKeysOptions | PouchDB.Core.AllDocsWithinRangeOptions | PouchDB.Core.AllDocsOptions, db?: string): Promise<PouchDB.Core.AllDocsResponse<{}>>;
    bulkDocs(docs: PouchDB.Core.PutDocument<{}>[], options?: PouchDB.Core.BulkDocsOptions, db?: string): Promise<(PouchDB.Core.Response | PouchDB.Core.Error)[]>;
    compact(options?: PouchDB.Core.CompactOptions, db?: string): Promise<PouchDB.Core.Response>;
    viewCleanup(db?: string): Promise<PouchDB.Core.BasicResponse>;
    info(db?: string): Promise<PouchDB.Core.DatabaseInfo>;
    putAttachment(docId: PouchDB.Core.DocumentId, rev: string, attachment: {
        id: string;
        data: PouchDB.Core.AttachmentData;
        type: string;
    }, db?: string): Promise<PouchDB.Core.Response>;
    getAttachment(docId: PouchDB.Core.DocumentId, attachmentId: PouchDB.Core.AttachmentId, db?: string): Promise<Blob | Buffer>;
    deleteAttachment(docId: PouchDB.Core.DocumentId, attachmentId: PouchDB.Core.AttachmentId, docRev: PouchDB.Core.RevisionId, db?: string): Promise<PouchDB.Core.RemoveAttachmentResponse>;
}
declare module 'vue/types/vue' {
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
