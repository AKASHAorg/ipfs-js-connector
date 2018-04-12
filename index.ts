import * as IPFS from 'ipfs';
import IpfsApiHelper from '@akashaproject/ipfs-connector-utils';
import * as Promise from 'bluebird';

const symbolEnforcer = Symbol();
const symbol = Symbol();
const requiredVersion = '0.28.2';

export default class IpfsJsConnector {

    public apiAddress: string;
    private _process: any;
    private _api: any;
    private _ports = {
        API: 5042,
        Gateway: 8042,
        Swarm: 4042
    };

    private _options: any = {};

    public logger: any = console;
    public serviceStatus: { api: boolean, process: boolean, version: string } = {
        process: false,
        api: false,
        version: ''
    };

    /**
     *
     * @param enforcer
     */
    constructor(enforcer: any) {
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of constructing a new object');
        }
    }

    /**
     *
     * @returns {any}
     */
    public static getInstance(): IpfsJsConnector {
        if (!this[symbol]) {
            this[symbol] = new IpfsJsConnector(symbolEnforcer);
        }
        return this[symbol];
    }

    /**
     * Get ipfs-connector-utils instance
     * @returns {any}
     */
    get api() {
        if (!this._api) {
            this._requireInstance();
            this._api = new IpfsApiHelper(this._process);
        }
        return this._api;
    }

    /**
     *
     * @param key
     * @returns {any}
     */
    public getOption(key: string) {
        if (!this._options.hasOwnProperty(key)) {
            throw new Error(`Option ${key} does not exist.`);
        }
        return this._options[key];
    }

    /**
     *
     * @param key
     * @param value
     */
    public setOption(key: string, value: any) {
        this._options[key] = value;
    }

    /**
     * Overwrite all options
     * @param config
     */
    public setOptions(config: any) {
        this._options = config;
    }

    /**
     * Get ipfs start configuration
     * @returns {{}&{repo: string, init: boolean, start: boolean, EXPERIMENTAL: {pubsub: boolean, sharding: boolean}, config: {Addresses: {}}}&{config: {Addresses: {API: string, Gateway: string, Swarm: ([string,string]|[string])}}}}
     */
    public get config() {
        return Object.assign({},
            {
                config: {
                    Addresses: {
                        API: (this._ports.API) ? `/ip4/127.0.0.1/tcp/${this._ports.API}` : '',
                        Gateway: (this._ports.Gateway) ? `/ip4/127.0.0.1/tcp/${this._ports.Gateway}` : '',
                        Swarm: (this._ports.Swarm) ? [
                            `/ip4/0.0.0.1/tcp/${this._ports.Swarm}`,
                            `/ip6/::/tcp/${this._ports.Swarm}`
                        ] : ['']
                    }
                }
            },
            this._options
        );
    }

    /**
     *
     * @param newLogger
     */
    public setLogger(newLogger: object) {
        this.logger = newLogger;
    }

    /**
     * Path to ipfs store
     * @param path
     */
    public setIpfsFolder(path: string) {
        if (this._options.hasOwnProperty('repo')) {
            this._options.repo = path;
        } else {
            Object.defineProperty(this._options, 'repo',
                {
                    enumerable: true,
                    configurable: true,
                    writable: true,
                    value: path
                });
        }
    }

    /**
     *
     * @param ipfsProvider      Ex: IPFS Companion
     * @returns {Bluebird<any>}
     */
    public start(ipfsProvider?: any) {
        return new Promise((resolve, reject) => {

            if (ipfsProvider) {
                this._process = ipfsProvider;
                this.serviceStatus.process = true;
                return resolve(this);
            }

            this._process = new IPFS(this.config);
            this.apiAddress = this.config.config.Addresses.API;
            this.on('error', (err) => {
                this.logger.error(err);
                reject(err);
            });
            this.on('start', () => {
                this.serviceStatus.process = true;
                this.logger.info('js-ipfs started');
                resolve(this);
            });
        }).then(() => {
            return this.api.apiClient.versionAsync().then((data: any) => {
                this.serviceStatus.api = true;
                this.serviceStatus.version = data.version;
                return this;
            });
        });
    }

    /**
     *
     * @returns {any}
     */
    public getNode() {
        return this._process;
    }

    /**
     *
     * @returns {boolean}
     */
    public stop() {
        if (this._process) {
            this._process.stop();
        }
        this._api = null;
        this._process = null;
        this.serviceStatus.api = false;
        this.serviceStatus.process = false;
        return true;
    }

    /**
     * Ex: 'ready', 'error', 'init', 'start', 'stop'
     * @param event
     * @param cb
     * @returns {any}
     */
    public on(event: string, cb: (data?: any) => void) {
        this._requireInstance();
        return this._process.on(event, cb);
    }

    /**
     *
     * @private
     */
    private _requireInstance() {
        if (!this._process) {
            throw new Error('Must provide a js-ipfs instance.');
        }
    }

    /**
     *
     * @param event
     * @param cb
     */
    public once(event: string, cb: (data?: any) => void) {
        this._requireInstance();
        return this._process.once(event, cb);
    }

    /**
     *
     * @param event
     * @param cb
     */
    public removeListener(event: string, cb: (data?: any) => void) {
        this._requireInstance();
        return this._process.removeListener(event, cb);
    }

    /**
     *
     * @param event
     * @returns {any|Cluster}
     */
    public removeAllListeners(event: string) {
        this._requireInstance();
        return this._process.removeAllListeners(event);
    }

    public listenerCount(event: string) {
        this._requireInstance();
        return this._process.listenerCount(event);
    }

    /**
     *
     * @returns {{gateway: number, api: number, swarm: number}}
     */
    public getPorts() {
        return Promise.resolve({
            gateway: this._ports.Gateway,
            api: this._ports.API,
            swarm: this._ports.Swarm
        });
    }

    /**
     *
     * @param ports
     * @param restart
     * @returns {Bluebird<{API, Gateway, Swarm}>}
     */
    public setPorts(ports: { gateway?: number, api?: number, swarm?: number }, restart = false) {
        this._ports = Object.assign({}, this._ports, {
            Gateway: ports.gateway,
            API: ports.api,
            Swarm: ports.swarm
        });

        if (restart) {
            return Promise
                .resolve(this.stop()).delay(1000)
                .then(() => {
                    return this.start().delay(500);
                })
                .then(() => ports);
        }
        return Promise.resolve(ports);
    }

    /**
     *
     * @returns {Bluebird<boolean>|Bluebird<U2|boolean>|PromiseLike<TResult2|boolean>|Thenable<boolean>|PromiseLike<boolean>|Promise<TResult|boolean>|any}
     */
    public checkVersion() {
        return this.api.apiClient.versionAsync().then(
            (data: any) => {
                this.serviceStatus.version = data.version;
                return data.version === requiredVersion;
            }
        );
    }
}