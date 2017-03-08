/*
 * js/sit/widgets/MedirWidget
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
    "dijit/a11yclick",
    "esri/toolbars/draw",
    "esri/geometry/geometryEngine",
    "esri/graphic",
    "esri/Color",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "dojo/text!./templates/MedirWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "modulos/Dibujo",
    "modulos/CapaGrafica3SR",
    "modulos/wkids",
    "dijit/form/ToggleButton",
    "dijit/form/Select"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    Draw, geometryEngine, Graphic, Color, SimpleLineSymbol, SimpleFillSymbol,
    template, i18n, domClass, domStyle,
    Dibujo, CapaGrafica3SR, wkids) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme : "sniaWidget",
            mapa : null,
            visible : true,
            active: false
        },
        constructor: function (options, srcRefNode) {
            var defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;
            this._i18n = i18n;
            this.set("mapa", defaults.mapa);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("active", defaults.active);
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._active);
            this._css = { };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(
                    on(this._areaNode, a11yclick, lang.hitch(this, this._bAreaClick)),
                    on(this._distanciaNode, a11yclick, lang.hitch(this, this._bDistanciaClick)),
                    on(this._unidadNode, "change", lang.hitch(this, this._unidadOnChange))
                );
            }
        },
        startup: function () {
            // no ha cargado
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('MedirWidget::requiere un mapa');
                }
                // mapa loaded
                if (this.mapa.loaded) {
                    this._init();
                } else {
                    on.once(this.mapa, "load", lang.hitch(this, function () {
                        this._init();
                    }));
                }
            }
        },
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
        activar: function () {
            this.set("active", true);
        },
        desactivar: function () {
            this.set("active", false);
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
        _active: function () {
            if (this.get("active")) {
                this._areaNode.set('disabled', false);
                this._distanciaNode.set('disabled', false);
                this._unidadNode.set('disabled', false);
                this._cg3sr.agregarMapa(this.mapa);
                this._activarDibujo();
            } else {
                this._areaNode.set('disabled', true);
                this._distanciaNode.set('disabled', true);
                this._unidadNode.set('disabled', true);
                this._cg3sr.removerMapa();
                this._desactivarDibujo();
            }
            this.emit("active-changed");
        },
        _init: function () {
            this._visible();
            //draw
            this._initCapa();
            this._initDibujo();
            this._reset();
            this._actUnidades();
            this._active();
            this.set("loaded", true);
            this.emit("load", {});
        },
        _initCapa: function () {
            this._lineSymbol = new SimpleLineSymbol("solid", new Color([255, 0, 0, 0.8]), 2);
            this._polySymbol = new SimpleFillSymbol("solid", this._lineSymbol, null);
            this._cg3sr = new CapaGrafica3SR({ id: "medirLayer" });
        },
        _initDibujo: function () {
            this._dibujo = new Dibujo({ showTooltips: false });
            this._dibujo.agregarMapa(this.mapa);
            this._dibujoCompleteListener = on(this._dibujo, "dibujo-complete", lang.hitch(this, this._dibujoComplete));
            this._dibujoEnabledChanged = on(this._dibujo, "dibujo-enabled-changed", lang.hitch(this, this._dibujoEnabledChanged));
        },
        //auxiliares
        _reset : function () {
            this._areaNode.set('checked', true);
            this._distanciaNode.set('checked', false);
        },
        _unCheckToggleButtons : function () {
            this._areaNode.set('checked', false);
            this._distanciaNode.set('checked', false);
        },
        _activarDibujo: function () {
            if (this._areaNode.get('checked')) {
                this._dibujo.activar(Draw.POLYGON);
            } else {
                this._dibujo.activar(Draw.POLYLINE);
            }
        },
        _desactivarDibujo: function () {
            this._dibujo.desactivar();
        },
        _actUnidades: function () {
            var options;
            if (this._areaNode.get('checked')) {
                options = [
                    { label: this._i18n.widgets.MedirWidget.lbm2, value: "square-meters", selected: true },
                    { label: this._i18n.widgets.MedirWidget.lbha, value: "hectares"},
                    { label: this._i18n.widgets.MedirWidget.lbkm2, value: "square-kilometers"}
                ];
            } else {
                options = [
                    { label: this._i18n.widgets.MedirWidget.lbm, value: "meters", selected: true },
                    { label: this._i18n.widgets.MedirWidget.lbmi, value: "miles" },
                    { label: this._i18n.widgets.MedirWidget.lbkm, value: "kilometers"}
                ];
            }
            this._unidadNode.set("options", options);
            this._unidadNode.reset();
        },
        _actMensaje: function () {
            var medida, unidad, g, g3sr;
            medida = "";
            unidad = "";
            g3sr = this._cg3sr.getGrafico("0");
            if (g3sr) {
                g = g3sr.grafico(wkids.UTM);
                if (this._areaNode.get('checked')) {
                    medida = geometryEngine.planarArea(g.geometry, this._unidadNode.get("value")).toFixed(2);
                    unidad = this._unidadNode.get("displayedValue");
                } else {
                    medida = geometryEngine.planarLength(g.geometry, this._unidadNode.get("value")).toFixed(2);
                    unidad = this._unidadNode.get("displayedValue");
                }
            }
            this._resultadoMedidaNode.innerHTML = medida;
            this._resultadoUnidadNode.innerHTML = unidad;
        },
        //manejadores
        _bAreaClick : function () {
            this._unCheckToggleButtons();
            this._cg3sr.limpiar();
            this._areaNode.set('checked', true);
            this._actUnidades();
            this._activarDibujo();
        },
        _bDistanciaClick : function () {
            this._unCheckToggleButtons();
            this._cg3sr.limpiar();
            this._distanciaNode.set('checked', true);
            this._actUnidades();
            this._activarDibujo();
        },
        _unidadOnChange: function () {
            this._actMensaje();
        },
        _dibujoComplete: function (evt) {
            var symbol, g;
            if (this._areaNode.get('checked')) {
                symbol = this._polySymbol;
            } else {
                symbol = this._lineSymbol;
            }
            g = new Graphic(evt.geometry, symbol);
            this._cg3sr.limpiar();
            this._cg3sr.agregarGrafico("0", g);
            this._actMensaje();
        },
        _dibujoEnabledChanged: function () {
            this.emit("dibujo-enabled-changed", {});
        }
    });
    return widget;
});
