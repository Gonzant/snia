/*
 * js/snia/widgets/CoordenadasWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/CoordenadasWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "esri/graphic",
    "modulos/Grafico3SR",
    "modulos/wkids"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle,
    Graphic, Grafico3SR, wkids) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true
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
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this._mapMouseMoveListener = on(this.mapa.map, "mouse-move", lang.hitch(this, this._mapMouseMove));
                this.own(
                    on(this.mapa, "reload", lang.hitch(this, this._mapaReload))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('CoordenadasWidget::requiere un mapa');
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
            this._mapMouseMoveListener.remove();
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
        desactive : function () {
            this._mapMouseMoveListener.remove();
        },
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
        _mapaReload : function () {
            this._mapMouseMoveListener.remove();
            this._mapMouseMoveListener = on(this.mapa.map, "mouse-move", lang.hitch(this, this._mapMouseMove));
        },
        _mapMouseMove : function (evt) {
            var g3sr, g;
            g3sr = new Grafico3SR(new Graphic(evt.mapPoint));
            //utm
            g = g3sr.grafico(wkids.UTM).geometry;
            this._utmNode.innerHTML = '&nbsp;&nbsp;' + g.x.toFixed(0) + ";" + '&nbsp;' + g.y.toFixed(0);
            //geo
            g = g3sr.grafico(wkids.GEO).geometry;
            this._geoNode.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + g.x.toFixed(4) + ";" + '&nbsp;' +  g.y.toFixed(4);
            //wm
            g = g3sr.grafico(wkids.WM).geometry;
            this._wmNode.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + g.x.toFixed(0) + ";" + '&nbsp;' + g.y.toFixed(0);
        },
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
            this.emit("load", {});
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        }
    });
    return widget;
});
