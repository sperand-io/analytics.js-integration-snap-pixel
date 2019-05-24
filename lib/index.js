'use strict';

/**
 * Module dependencies.
 */

var integration = require('@segment/analytics.js-integration');
var Track = require('segmentio-facade').Track;
var Identify = require('segmentio-facade').Identify;

/**
 * Expose `Snap Pixel`.
 */

var SnapPixel = module.exports = integration('Snap Pixel')
  .global('snaptr')
  .option('pixelId', '')
  .tag('<script src="https://sc-static.net/scevent.min.js">');

/**
 * Initialize Snap Pixel.
 *
 * @param {Facade} page
 */

SnapPixel.prototype.initialize = function() {
  window.snaptr = function() {
    window.snaptr.handleRequest
    ? window.snaptr.handleRequest.apply(window.snaptr, arguments)
    : window.snaptr.queue.push(arguments);
  };
   
  window.snaptr.queue = [];
  this.load(this.ready);
  var traits = this.analytics.user().traits() || {};
  var id = new Identify({ traits: traits });
  var email = id.email();

  if (email) {
    window.snaptr('init', this.options.pixelId, { user_email: email });
  } else {
    window.snaptr('init', this.options.pixelId);
  }
};

/**
 * Has the Snap Pixel library been loaded yet?
 *
 * @return {Boolean}
 */

SnapPixel.prototype.loaded = function() {
  return !!(window.snaptr && window.snaptr.handleRequest);
};

/**
 * Trigger a page view.
 *
 * @param {Facade} identify
 */

SnapPixel.prototype.page = function() {
  window.snaptr('track', 'PAGE_VIEW');
};

/**
 * Track an event.
 * non-spec'd events get sent as "custom events" with full
 * tranformed payload
 *
 * @param {Facade} track
 */

SnapPixel.prototype.track = function(track) {
  var event = track.event();
  var props = track.properties();

  var properties = Object.keys(props).reduce(function(acc, key) {
    if (key === 'price' || key === 'value' || key === 'revenue') {
      acc.price = formatRevenue(props[key]);
    } else {
      acc[key] = props[key];
    }
    return acc;
  }, {});

  window.snaptr('trackCustom', event, properties);
};

/**
 * Product List Viewed.
 *
 * @api private
 * @param {Track} track category
 */

SnapPixel.prototype.productListViewed = function(track) {
  var productIds = [];
  var products = track.products();
  
  // First, check to see if a products array with productIds has been defined.
  if (Array.isArray(products)) {
    products.forEach(function(product) {
      var productId = product.productId || product.product_id;
      if (productId) {
        productIds.push(productId);
      }
    });
  }

  window.snaptr('track', 'VIEW_CONTENT', {
    item_ids: productIds
  });
};

/**
 * Product viewed.
 *
 * @api private
 * @param {Track} track
 */

SnapPixel.prototype.productViewed = function(track) {
  window.snaptr('track', 'VIEW_CONTENT', {
    item_ids: [track.productId() || track.id() || track.sku() || ''],
    item_category: track.category() || '',
    currency: track.currency(),
    price: formatRevenue(track.price())
  });
};

/**
 * Product added.
 *
 * @api private
 * @param {Track} track
 */

SnapPixel.prototype.productAdded = function(track) {
  window.snaptr('track', 'ADD_TO_CART', {
    item_ids: [track.productId() || track.id() || track.sku() || ''],
    item_category: track.category() || '',
    currency: track.currency(),
    price: formatRevenue(track.price())
  });
};

/**
 * Order Completed.
 *
 * @api private
 * @param {Track} track
 */

SnapPixel.prototype.orderCompleted = function(track) {
  var itemIds = (track.products() || []).reduce(function(acc, product) {
    var item = new Track({ properties: product });
    var key = item.productId() || item.id() || item.sku();
    if (key) acc.push(key);
    return acc;
  }, []);

  var revenue = formatRevenue(track.revenue());

  window.snaptr('track', 'PURCHASE', {
    transaction_id: (track.orderId() || '').toString(),
    currency: track.currency(),
    item_ids: itemIds,
    price: revenue
  });
};


/**
 * Get Revenue Formatted Correctly for Snap.
 *
 * @api private
 * @param {Track} track
 */

function formatRevenue(revenue) {
  return Number(revenue || 0).toFixed(2);
}
