'use strict';

module.exports = (function() {
    try {
        return !!new Blob();
    } catch (e) {
        return false;
    }
}());
