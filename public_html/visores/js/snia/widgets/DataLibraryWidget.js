/*
 * js/snia/widgets/DataLibraryWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */

define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/text!./templates/DataLibraryWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class", "dojo/dom-style",
    "esri/map",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    'esri/geometry/Extent',
    "esri/layers/WMSLayer",
    'esri/layers/WMSLayerInfo',
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/fx",
    "dojo/domReady!",
    "dojox/layout/ScrollPane"
], function (on,
    Evented, declare, lang,  template, i18n, domClass, domStyle, Map,  
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick, Extent, WMSLayer,WMSLayerInfo) {

    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            active: false,
            config: {}
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            //propiedades
            this.set("mapa", defaults.mapa);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("config", defaults.config);
            this.set("active", defaults.active);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._active);
            
            // classes
            this._css = {
                //baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                if (this.config.mapasBase) {
                    this._mapasBase = this.config.mapasBase;
                }
            }            
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('DataLibraryWidget::requiere un mapa');
            }
            //  mapa cargado
            if (this.mapa.loaded) {
                this._init();
            } else {
                on.once(this.mapa, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },
        // connections/subscriptions se limpian durante la fase destroy()
        destroy: function () {
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Eventos Publicos */
        /* ---------------- */
        // load
        /* ---------------- */
        /* Funciones publicas */
        /* ---------------- */
        show: function () {
            this.set("visible", true);
        },
        hide: function () {
            this.set("visible", false);
        },
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
        _visible: function () {
            if (this.get("visible")) {
                domStyle.set(this.domNode, 'display', 'block');
            } else {
                domStyle.set(this.domNode, 'display', 'none');
            }
        },
        _init: function () {
            this._visible();
            this.set("loaded", true);
            lang.hitch(this, this._loadWMS());
            this._active();
            
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
 
        _active: function () {
            this.emit("active-changed", {});           
        },
 
        _calendarClick: function () {
//            arrayUtil.forEach(this._toc._rootLayerTOCs, lang.hitch(this, function (item) {
//                item._rootLayerNode.expand();
//            }));
        },

        _loadWMS: function () {           
//        var layer1 = new WMSLayerInfo({
//            name: 'x',
//            title: 'x'
//        });
//        var resourceInfo = {
//            extent: new Extent(-59, -35.125, -52.75, -30, {
//            wkid: 4326
//             }),
//            layerInfos: [layer1]
//        };
//        var wmsLayer = new WMSLayer("http://dlibrary.snia.gub.uy/SOURCES/.NOAA/.NCEP/.CPC/.CMORPH/.V1temp/.RAW/.daily/.prcp/T/378.5/VALUE/X/Y/fig-/colors/-fig/wms.xml", {
//            format: "gif",
//            opacity: 0.9,
//            resourceInfo: resourceInfo,
//            visibleLayers: [0],
//            id:"data library"
//          });
//        this.mapa.mapLayers.push(wmsLayer);
//        this.mapa.map.addLayer(wmsLayer);
        }
    });
    return widget;
});
