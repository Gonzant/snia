/*
 * js/snia/widgets/RiesgoDibujar
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
    "dojo/text!./templates/RiesgoDibujoWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "modulos/Dibujo", "esri/toolbars/draw",
    "modulos/CapaGrafica3SR",
    "esri/tasks/FeatureSet",
    "esri/Color",
    "esri/graphic", "dijit/a11yclick",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "dojox/widget/Standby",
    "dojo/dom-construct",
    "jspdf/jspdf.min"
], function (on, Evented, declare, lang, _WidgetBase, _TemplatedMixin,
    _WidgetsInTemplateMixin, template, i18n, domClass, domStyle,
    Dibujo, Draw, CapaGrafica3SR, FeatureSet, Color, Graphic, a11yclick, SimpleLineSymbol, SimpleFillSymbol,
    Standby, domConst) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: true,
        resize : function () {
            if (this._tabContainerInfo) {
                this._tabContainerInfo.resize();
            }
        },
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            active: false
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults;
            defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            //propiedades
            this.set("mapa", defaults.mapa);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("active", defaults.active);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._activar);
            // classes
            this._css = {
               // baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(

                );
            }
            //Rueda de espera
            this._standby = new Standby({target: this._ruedaEspera});
            domConst.place(this._standby.domNode, this._ruedaEspera, "after");
            this._standby.startup();
        },
        _activar: function () {
            this.emit("active-changed");
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                }
                //  mapa cargado
                if (this.mapa.loaded) {
                    this._init();
                } else {
                    on.once(this.mapa, "load", lang.hitch(this, function () {
                        this._init();
                    }));
                }
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
            this._activar();
            this.set("loaded", true);
            this.emit("load", {});
            this._initDibujo();
            this._count = 0;
            this._features = [];
            on(this._terminoDib, a11yclick, lang.hitch(this, this._terminoDibujo));
            on(this._cancelarDib, a11yclick, lang.hitch(this, this._cancelarDibujo));
            on(this._atrasDib, a11yclick, lang.hitch(this, this._desmarcarUbicacion));
        },
        _initDibujo: function () {
            this._dibujo = new Dibujo();
            this._dibujo.agregarMapa(this.mapa);
            on(this._dibujo, "dibujo-complete", lang.hitch(this, this._dibujoComplete));
            //Capa grafica
            this._cg3sr = new CapaGrafica3SR();
            this._cg3sr.agregarMapa(this.mapa);
            this._dibujo.activar(Draw.POLYGON);
        },
        _dibujoComplete: function (evt) {
            var fillSymbol;
            fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 192, 0]), 1),
                new Color([255, 192, 0, 0.25]));
            this._puntoGrafico = new Graphic(evt.geometry, fillSymbol);
            this._cg3sr.agregarGrafico(this._count.toString(), this._puntoGrafico);
            this._count = this._count + 1;
            this._features.push(this._puntoGrafico);
        },
        _desmarcarUbicacion: function () {
            var c;
            for (c = 0; c < this._count; c = c + 1) {
                this._cg3sr.removerGrafico(c.toString());
            }
            this._count = 0;
            this._dibujo.desactivar();
            this._puntoGrafico = undefined;
            this._features = undefined;
            this._features = [];
            this.emit('destruir', {});
        },
        _cancelarDibujo: function () {
            var c;
            for (c = 0; c < this._count; c = c + 1) {
                this._cg3sr.removerGrafico(c.toString());
            }
            this._count = 0;
            this._puntoGrafico = undefined;
            this._features = undefined;
            this._features = [];
        },
        _terminoDibujo: function () {
            var featureSet;
            this._dibujo.desactivar();
            featureSet = new FeatureSet();
            featureSet.features = this._features;

            this.emit('invocar-riesgo', {featureSet: featureSet, capaGrafica: this._cg3sr, count: this._count });
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



