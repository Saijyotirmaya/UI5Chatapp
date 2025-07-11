/* global QUnit */
// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

sap.ui.require([
	"sapktcom/mini-hr-solution/test/unit/AllTests"
], function (Controller) {
	"use strict";
	QUnit.start();
});