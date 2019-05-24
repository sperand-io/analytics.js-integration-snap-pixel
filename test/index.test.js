'use strict';

var Analytics = require('@segment/analytics.js-core').constructor;
var sandbox = require('@segment/clear-env');
var tester = require('@segment/analytics.js-integration-tester');
var SnapPixel = require('../lib');

describe('Snap Pixel', function() {
  var analytics;
  var snapPixel;
  var options = {
    pixelId: '123123123'
  };

  beforeEach(function() {
    analytics = new Analytics();
    snapPixel = new SnapPixel(options);
    analytics.use(SnapPixel);
    analytics.use(tester);
    analytics.add(snapPixel);
    analytics.identify('123', {
      e_mail: 'gottaketchumall@poke.mon'
    });
  });

  afterEach(function(done) {
    analytics.waitForScripts(function() {
      analytics.restore();
      analytics.reset();
      snapPixel.reset();
      sandbox();
      done();
    });
  });

  describe('before loading', function() {
    beforeEach(function() {
      analytics.stub(snapPixel, 'load');
    });

    afterEach(function() {
      snapPixel.reset();
    });

    describe('#initialize', function() {
      it('should call load on initialize', function() {
        analytics.initialize();
        analytics.called(snapPixel.load);
      });

      it('should create snaptr object', function() {
        analytics.initialize();
        analytics.assert(window.snaptr instanceof Function);
      });

      it('should call init with the user\'s email', function() {
        analytics.stub(window, 'snaptr');
        analytics.spy(window.snaptr);
        setTimeout(function() {
          analytics.initialize();
          analytics.called(window.snaptr, 'init', options.pixelId, {
            user_email: 'gottaketchumall@poke.mon'
          });
        }, 1000);
      });
    });
  });

  describe('loading', function() {
    beforeEach(function() {
      analytics.stub(window, 'snaptr');
      analytics.initialize();
    });

    it('should load', function(done) {
      analytics.load(snapPixel, done);
    });
  });

  describe('after loading', function() {
    beforeEach(function(done) {
      analytics.once('ready', done);
      analytics.initialize();
    });

    describe('#page', function() {
      beforeEach(function() {
        analytics.stub(window, 'snaptr');
      });

      it('should track a pageview', function() {
        analytics.page();
        analytics.called(window.snaptr, 'track', 'PAGE_VIEW');
      });
    });

    describe('#track', function() {
      beforeEach(function() {
        analytics.stub(window, 'snaptr');
      });

      describe('event not mapped standard', function() {
        it('should send a "custom" event', function() {
          analytics.track('event');
          analytics.called(window.snaptr, 'trackCustom', 'event');
        });

        it('should send a "custom" event and properties', function() {
          analytics.track('event', { property: true });
          analytics.called(window.snaptr, 'trackCustom', 'event', { property: true });
        });

        it('should send properties correctly', function() {
          analytics.track('event', {
            currency: 'XXX',
            revenue: 13,
            property: true
          });
          analytics.called(window.snaptr, 'trackCustom', 'event', {
            currency: 'XXX',
            price: '13.00',
            property: true
          });
        });
      });

      describe('Segment Ecommerce => Snap Standard Events', function() {
        describe('Product List Viewed', function() {
          it('Should map item_ids parameter to product_ids', function() {
            analytics.track('Product List Viewed', {
              category: 'Games', 
              products: [
                {
                  product_id: '507f1f77bcf86cd799439011',
                  sku: '45790-32',
                  name: 'Monopoly: 3rd Edition',
                  price: 19,
                  position: 1,
                  category: 'Games',
                  url: 'https://www.example.com/product/path',
                  image_url: 'https://www.example.com/product/path.jpg'
                },
                {
                  product_id: '505bd76785ebb509fc183733',
                  sku: '46493-32',
                  name: 'Uno Card Game',
                  price: 3,
                  position: 2,
                  category: 'Games'
                }
              ]
            });
            analytics.called(window.snaptr, 'track', 'VIEW_CONTENT', {
              item_ids: ['507f1f77bcf86cd799439011', '505bd76785ebb509fc183733']
            });
          });
        });

        it('Product Viewed', function() {
          analytics.track('Product Viewed', {
            product_id: '507f1f77bcf86cd799439011',
            currency: 'USD',
            quantity: 1,
            price: 44.33,
            name: 'my product',
            category: 'cat 1',
            sku: 'p-298'
          });
          analytics.called(window.snaptr, 'track', 'VIEW_CONTENT', {
            item_ids: ['507f1f77bcf86cd799439011'],
            item_category: 'cat 1',
            currency: 'USD',
            price: '44.33'
          });
        });

        it('Adding to Cart', function() {
          analytics.track('Product Added', {
            product_id: '507f1f77bcf86cd799439011',
            currency: 'USD',
            quantity: 1,
            name: 'my product',
            category: 'cat 1',
            sku: 'p-298',
            price: 24.75
          });
          analytics.called(window.snaptr, 'track', 'ADD_TO_CART', {
            item_ids: ['507f1f77bcf86cd799439011'],
            item_category: 'cat 1',
            currency: 'USD',
            price: '24.75'
          });
        });

        it('Completing an Order', function() {
          analytics.track('Order Completed', {
            products: [
              { product_id: '507f1f77bcf86cd799439011' },
              { product_id: '505bd76785ebb509fc183733' }
            ],
            currency: 'USD',
            total: 0.50,
            orderId: 123
          });
          analytics.called(window.snaptr, 'track', 'PURCHASE', {
            item_ids: ['507f1f77bcf86cd799439011', '505bd76785ebb509fc183733'],
            currency: 'USD',
            price: '0.50',
            transaction_id: '123'
          });
        });
      });
    });
  });
});
