/*
 * js/snia/widgets/MapaWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/MapaWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "esri/map",
    "esri/dijit/Scalebar",
    "esri/graphic",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/FeatureLayer",
    "esri/toolbars/navigation",
    "modulos/Grafico3SR"
], function (on, Evented, declare, lang, arrayUtil,
    _WidgetBase, _TemplatedMixin,
    template, i18n, domClass, domStyle,
    Map, Scalebar, Graphic, ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer, FeatureLayer,
    Navigation, Grafico3SR) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, Evented], {
        templateString: template,
        options : {
            theme : "sitWidget",
            mapOptions : {},
            visible : true,
            mapLayers : [],
            baseMapLayer : null
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            //propiedades
            this.set("mapOptions", defaults.mapOptions);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            //ArcGisDynamicMapServiceLayer y FeatureLayer
            this.set("mapLayers", defaults.mapLayers);
            this.set("baseMapLayer", defaults.baseMapLayer);
            this.set("dibujoEnable", null);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("baseMapLayer", this._baseMapLayerChanged);
            this.watch("dibujoEnable", this._dibujoEnabledChanged);
            // classes
            this._css = { };
        },
        postCreate: function () {
            this.inherited(arguments);
            this.set("map", new Map(this._mapNode, this.mapOptions));
            if (this.baseMapLayer) {
                this.map.addLayer(this.baseMapLayer);
            }
        },
        // start widget. invocado por el usuario
        startup: function () {
            // map no esta definido
            if (!this.map) {
                this.destroy();
                console.log('MapaWidget::problema al crear el mapa');
            }
            // cuando map carga
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
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
        // reload -> cuando cambia la referencia espacial del mapa base
        // dibujo-enabled-changed -> cuando cambia el estado del dibujo
        /* ---------------- */
        /* Funciones publicas */
        /* ---------------- */
        show: function () {
            this.set("visible", true);
        },
        hide: function () {
            this.set("visible", false);
        },
        agregarCapa: function (layer, index) {
            if (layer && (layer instanceof ArcGISDynamicMapServiceLayer
                    || layer instanceof FeatureLayer)) {
                if (typeof index !== 'undefined') {
                    this.mapLayers.splice(index, 0, layer);
                    this.map.addLayer(layer, index);
                } else {
                    this.mapLayers.push(layer);
                    this.map.addLayer(layer);
                }
            }
        },
        removerCapa: function (layer) {
            if (layer) {
                var index = arrayUtil.indexOf(this.mapLayers, layer);
                if (index > 0) {
                    this.map.removeLayer(layer);
                    this.mapLayers.splice(index, 1);
                }
            }
        },
        /*ArcGISTiledMapServiceLayer*/
        setMapaBase: function (tiledLayer) {
            if (tiledLayer && tiledLayer instanceof ArcGISTiledMapServiceLayer
                    /*&& wkids.wkidOk(tiledLayer.spatialReference.wkid)*/) {
                var g, g3sr;
                g = new Graphic(this.map.extent);
                g3sr = new Grafico3SR(g);
                this._ultExtent = g3sr;
                this.set("loaded", false);
                this.map.destroy();
                this.set("baseMapLayer", tiledLayer);
                this.set("map", new Map(this._mapNode, {
                    logo: false,
                    slider: false
                }));
                if (this.baseMapLayer) {
                    this.map.addLayer(this.baseMapLayer);
                }
                this._restartup();
            }
        },
        setMapaBaseBackup: function (mapOptionsBackup, baseMapLayerBackup) {
            //Manejador para el evento de error en mapa base
            on(this.baseMapLayer, 'error', lang.hitch(this, function () {
                //Si falla al cargar el mapa base intenta con el de backup
                this.map.destroy();
                this.set("map", new Map(this._mapNode, mapOptionsBackup));
                this.setMapaBase(baseMapLayerBackup);
                this._init();
            }));            
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
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _init: function () {
            var scalebar, navToolbar;
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
            scalebar = new Scalebar({
                map: this.map,
                scalebarUnit: "metric"
            });
            navToolbar = new Navigation(this.map);
           
        },
        _dibujoEnabledChanged: function () {
            this.emit("dibujo-enabled-change", this.dibujoEnable);
        },
        _baseMapLayerChanged: function (tiledLayer) {
            if (tiledLayer && tiledLayer instanceof ArcGISTiledMapServiceLayer
                    /*&& wkids.wkidOk(tiledLayer.spatialReference.wkid)*/) {
                var g, g3sr;
                g = new Graphic(this.map.extent);
                g3sr = new Grafico3SR(g);
                this._ultExtent = g3sr;
                this.set("loaded", false);
                this.map.destroy();
                this.set("baseMapLayer", tiledLayer);
                this.set("map", new Map(this._mapNode, {
                    logo: false,
                    slider: false
                }));
                if (this.baseMapLayer) {
                    this.map.addLayer(this.baseMapLayer);
                }
                this._restartup();
            }
        },
        //reload
        _limpiarMap : function () {
            if (this.map) {
                //remuevo layers
                this.map.removeAllLayers();
            }
        },
        _cargarMap : function () {
            if (this.map) {
                //cargo mapLayers
                arrayUtil.forEach(this.mapLayers, lang.hitch(this, function (layer) {
                    this.map.addLayer(layer);
                }));
            }
        },
        _reinit: function () {
            if (this._ultExtent) {
                this.map.setExtent(this._ultExtent.grafico(this.map.spatialReference.wkid).geometry);
            }
            //cargo capas
            this._cargarMap();
            //finalizo reinit
            this._visible();
            this.set("loaded", true);
            this.emit("reload", {});
        },
        _restartup: function () {
            // map no esta definido
            if (!this.map) {
                this.destroy();
                console.log('MapaWidget::problema al re-crear el mapa');
            }
            // cuando map carga
            if (this.map.loaded) {
                this._reinit();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._reinit();
                }));
            }
        }
    });
    return widget;
});
