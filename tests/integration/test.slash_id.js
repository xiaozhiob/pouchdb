'use strict';

var adapters = ['local', 'http'];
var repl_adapters = [
  ['local', 'http'],
  ['http', 'http'],
  ['http', 'local'],
  ['local', 'local']
];

adapters.forEach(function (adapter) {
  describe('test.slash_ids.js-' + adapter, function () {

    var dbs = {};

    beforeEach(function () {
      dbs.name = testUtils.adapterUrl(adapter, 'testdb');
    });

    afterEach(function (done) {
      testUtils.cleanup([dbs.name], done);
    });

    it('Insert a doc, putAttachment and get', function (done) {
      var db = new PouchDB(dbs.name);
      var docId = 'doc/with/slashes';
      var attachmentId = 'attachment/with/slashes';
      var blobData = 'attachment content';
      var blob = testUtils.makeBlob(blobData);
      var doc = {_id: docId, test: true};
      db.put(doc, function (err, info) {
        should.not.exist(err, 'saved doc');
        info.id.should.equal('doc/with/slashes', 'id is the same as inserted');
        db.putAttachment(docId, attachmentId, info.rev, blob, 'text/plain',
                         function () {
          db.getAttachment(docId, attachmentId, function (err, res) {
            testUtils.readBlob(res, function (data) {
              data.should.equal(blobData);
              db.get(docId, function (err, res) {
                res._id.should.equal(docId);
                res._attachments.should.include.keys(attachmentId);
                done();
              });
            });
          });
        });
      });
    });

    it('BulkDocs and changes', function (done) {
      var db = new PouchDB(dbs.name);
      var docs = [
        {_id: 'part/doc1', int: 1},
        {_id: 'part/doc2', int: 2, _attachments: {
          'attachment/with/slash': {
            content_type: 'text/plain',
            data: 'c29tZSBkYXRh'
          }
        }},
        {_id: 'part/doc3', int: 3}
      ];
      db.bulkDocs({ docs }, function (err, res) {
        for (var i = 0; i < 3; i++) {
          res[i].ok.should.equal(true, 'correctly inserted ' + docs[i]._id);
        }
        db.allDocs({
          include_docs: true,
          attachments: true
        }, function (err, res) {
          res.rows.sort(function (a, b) {
            return a.doc.int - b.doc.int;
          });
          for (var i = 0; i < 3; i++) {
            res.rows[i].doc._id.should
              .equal(docs[i]._id, '(allDocs) correctly inserted ' +
                     docs[i]._id);
          }
          res.rows[1].doc._attachments.should.include
            .keys('attachment/with/slash');
          db.changes({return_docs: true}).on('complete', function (res) {
            res.results.sort(function (a, b) {
              return a.id.localeCompare(b.id);
            });
            for (var i = 0; i < 3; i++) {
              res.results[i].id.should
                .equal(docs[i]._id, 'correctly inserted');
            }
            done();
          }).on('error', done);
        });
      });
    });

  });
});


repl_adapters.forEach(function (adapters) {
  describe('test.slash_ids.js-' + adapters[0] + '-' + adapters[1], function () {

    var dbs = {};

    beforeEach(function (done) {
      dbs.name = testUtils.adapterUrl(adapters[0], 'test_slash_ids');
      dbs.remote = testUtils.adapterUrl(adapters[1], 'test_slash_ids_remote');
      testUtils.cleanup([dbs.name, dbs.remote], done);
    });

    afterEach(function (done) {
      testUtils.cleanup([dbs.name, dbs.remote], done);
    });


    it('Attachments replicate', function (done) {
      var binAttDoc = {
        _id: 'bin_doc/with/slash',
        _attachments: {
          'foo/with/slash.txt': {
            content_type: 'text/plain',
            data: 'VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ='
          }
        }
      };
      var docs1 = [
        binAttDoc,
        {_id: '0', integer: 0},
        {_id: '1', integer: 1},
        {_id: '2', integer: 2},
        {_id: '3', integer: 3}
      ];
      var db = new PouchDB(dbs.name);
      var remote = new PouchDB(dbs.remote);
      remote.bulkDocs({ docs: docs1 }, function () {
        db.replicate.from(remote, function () {
          db.get('bin_doc/with/slash', { attachments: true },
            function (err, doc) {
            binAttDoc._attachments['foo/with/slash.txt'].data.should
              .equal(doc._attachments['foo/with/slash.txt'].data);
            done();
          });
        });
      });
    });
  });
});
