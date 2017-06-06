import IpfsConnector from './index';
import { expect } from 'chai';
import * as rimraf from 'rimraf';

describe('ipfs-js-connector', function () {
    this.timeout(4000);
    let instance: any;
    const repo = 'test-repo';
    const logger = {
        info: function () {
        },
        error: function () {
        },
        warn: function () {
        }
    };
    const options = {
        repo: '0x497066734a73436f6e6e6563746f72',
        init: true,
        start: true
    };

    it('gets singleton instance', function () {
        instance = IpfsConnector.getInstance();
        IpfsConnector.getInstance().setOptions(options);
        expect(instance).to.exist;
    });

    it('prevents multiple instances', function () {
      const getNewInstance = () => new IpfsConnector(Symbol());
      expect(getNewInstance).to.throw(Error);
    });

    it('sets ipfs storage path', function () {
        IpfsConnector.getInstance().setIpfsFolder(repo);
        expect(IpfsConnector.getInstance().getOption('repo')).to.equal(repo);
    });
    it('constructs configuration for ipfs node', function () {
        expect(IpfsConnector.getInstance().config).to.have.property('config');
    });

    it('starts an js-ipfs node', function () {
        return instance.start().then((node: any) => {
            expect(node.serviceStatus.process).to.be.true;
        });
    });

    it('provides an api helper', function () {
        expect(instance.api).to.exist;
    });

    it('throws for unknown option', function () {
        const validate = () => IpfsConnector.getInstance().getOption('notExistent');
        expect(validate).to.throw(Error);
    });

    it('sets a different logger', function () {
        IpfsConnector.getInstance().setLogger(logger);
        expect(IpfsConnector.getInstance().logger).to.eql(logger);
    });

    it('checks current ipfs version', function () {
        return IpfsConnector.getInstance().checkVersion().then((valid: boolean) => {
            expect(valid).to.be.true;
        });
    });

    it('sets an option', function () {
        IpfsConnector.getInstance().setOption('init', false);
        expect(IpfsConnector.getInstance().getOption('init')).to.eql(false);
    });

    it('stops ipfs node', function () {
        IpfsConnector.getInstance().stop();
        expect(IpfsConnector.getInstance().getNode()).to.be.null;
    });

    it('prevents listening before starting an ipfs node', function () {
        const listener = () => IpfsConnector.getInstance().on('start', () => {
        });
        expect(listener).to.throw(Error);
    });

    it('can attach listeners', function (done) {
        IpfsConnector.getInstance().start().then((i: any) => {
            IpfsConnector.getInstance().once('stop', () => {
                done();
            });
            i.stop();
        });
    });

    it('gets listeners count', function () {
        return IpfsConnector.getInstance().start().then((i: any) => {
            expect(i.listenerCount('stop')).to.eql(0);
        });
    });

    it('gets current ports used', function () {
        return IpfsConnector.getInstance().getPorts().then((ports) => {
            expect(ports).to.have.property('api');
        });
    });

    it('should set ipfs GATEWAY port', function () {
        return instance.setPorts({ gateway: 8092 }).then((ports: any) => {
            expect(ports).to.exist;
        });
    });

    it('should set ipfs API port', function () {
        return instance.setPorts({ api: 5043 }).then((ports: any) => {
            expect(ports).to.exist;
        });
    });

    it('should set ipfs SWARM port', function () {
        return instance.setPorts({ swarm: 4043 }).then((ports: any) => {
            expect(ports).to.exist;
        });
    });

    it('restarts after setting ports', function () {
        return instance.setPorts({ api: 5041, swarm: 4041, gateway: 8040 }, true)
            .then((ports: any) => {
                expect(IpfsConnector.getInstance().apiAddress).to.equal('/ip4/127.0.0.1/tcp/5041');
                expect(ports).to.exist;
            });
    });

    it('disables config addresses', function () {
        return instance.setPorts({ api: false, swarm: false, gateway: false }).then((ports: any) => {
            expect(instance.config.api).to.not.exist;
            expect(ports).to.exist;
        });
    });

    it('should remove listeners', function () {

        const cb = () => false;
        IpfsConnector.getInstance().on('stop', () => {
            return true;
        });
        IpfsConnector.getInstance().on('stop', cb);
        expect(IpfsConnector.getInstance().listenerCount('stop')).to.eql(2);
        IpfsConnector.getInstance().removeListener('stop', cb);
        expect(IpfsConnector.getInstance().listenerCount('stop')).to.eql(1);
        IpfsConnector.getInstance().removeAllListeners('stop');
        expect(IpfsConnector.getInstance().listenerCount('stop')).to.eql(0);
    });

    it('Overwrites options', function(){
       IpfsConnector.getInstance().setOptions({start: false, repo: 'test1'});
       expect(IpfsConnector.getInstance().config.start).to.be.false;
    });

    it('doesnt throw when calling sequential stop', function () {
       const calls = () => {
           IpfsConnector.getInstance().stop();
           return IpfsConnector.getInstance().stop();
       };
       expect(calls).to.not.throw(Error);
    });

    after(function (done) {
        return rimraf(repo, done);
    });
});