/*
 * js/snia/widgets/AreasConeatWidget
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
    "dojo/text!./templates/AreasConeatWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "esri/graphic",
    "modulos/Dibujo",
    "modulos/CapaGrafica3SR",
    "modulos/wkids",
    "esri/toolbars/draw",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/Color",
    "dijit/Tooltip",
    "dijit/a11yclick",
    "esri/tasks/GeometryService",
    "esri/tasks/AreasAndLengthsParameters",
    "esri/tasks/Geoprocessor",
    "esri/tasks/FeatureSet",
    "dojox/widget/Standby",
    "dojo/dom-construct",
    "dijit/form/CheckBox",
    "dojo/domReady!"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, Graphic, Dibujo, CapaGrafica3SR, wkids, Draw,
    SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol,
    Color, Tooltip, a11yclick, GeometryService, AreasAndLengthsParameters, Geoprocessor, FeatureSet,
    Standby, domConstruct, CheckBox) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            active: false
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
            this.set("active", defaults.active);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._active);
            // classes
            this._css = {
               // baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(
                    on(this._agregarArea, a11yclick, lang.hitch(this, this._initDibujo)),
                    on(this._cancelarAgregarArea, a11yclick, lang.hitch(this, this._cancelarAgregarDibujo)),
                    on(this._removerTodasAreas, a11yclick, lang.hitch(this, this._eliminarDibujos)),
                    on(this._croquisAreas, a11yclick, lang.hitch(this, this._croquis))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('AreasConeatWidget::requiere un mapa');
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
        _active: function () {
            if (this.get("active")) {
                this._agregarArea.setAttribute('enabled', true);
                this._cancelarAgregarArea.setAttribute('enabled', true);
                this._removerTodasAreas.setAttribute('enabled', true);
                this._croquisAreas.setAttribute('enabled', true);
                this._cpg3SR.agregarMapa(this.mapa);
                this.emit("active-changed");
                this._initDibujo;
            } else {
                this._dibujo.desactivar();
                if (!this._mantenerGeom) {
                    this._cpg3SR.removerMapa();
                }
                this._agregarArea.setAttribute('disabled', true);
                this._cancelarAgregarArea.setAttribute('disabled', true);
                this._removerTodasAreas.setAttribute('disabled', true);
                this._croquisAreas.setAttribute('disabled', true);
                this._desactivarDibujo();
            }
        },
        desactive: function () {
            this._dibujo.desactivar();
            this._cpg3SR.removerMapa();
            this._agregarArea.setAttribute('disabled', true);
            this._cancelarAgregarArea.setAttribute('disabled', true);
            this._desmarcarArea.setAttribute('disabled', true);
            this._removerAreaSeleccionada.setAttribute('disabled', true);
            this._removerTodasAreas.setAttribute('disabled', true);
            this._croquisAreas.setAttribute('disabled', true);
            this._desactivarDibujo();
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
            var server, ttAgregar, ttCancelar, tteliminar, ttcroquis, checkBox;
            this._visible();
            this._i = 0;
            //Tooltip para botón Agregar Área
            ttAgregar = new Tooltip({
                connectId: ["btnAgregarArea"],
                label: this._i18n.widgets.AreasConeatWidget.lbTtAgregar,
                position: ['below']
            });
            //Tooltip para botón Cancelar Agregar Área
            ttCancelar = new Tooltip({
                connectId: ["btnCancelarAgregarArea"],
                label: this._i18n.widgets.AreasConeatWidget.lbTtCancelar,
                position: ['below']
            });
            //Tooltip para botón Remover Todas Área
            new Tooltip({
                connectId: ["btnRemoverTodasAreas"],
                label: this._i18n.widgets.AreasConeatWidget.lbTtRemoverT,
                position: ['below']
            });
            //Tooltip para botón Croquis Área
            new Tooltip({
                connectId: ["btnCroquisAreas"],
                label: this._i18n.widgets.AreasConeatWidget.lbTtCroquis,
                position: ['below']
            });
            this._markerSymbol = new SimpleMarkerSymbol();
            this._markerSymbol.setPath("M16,4.938c-7.732,0-14,4.701-14,10.5c0,1.981,0.741,3.833,2.016,5.414L2,25.272l5.613-1.44c2.339,1.316,5.237,2.106,8.387,2.106c7.732,0,14-4.701,14-10.5S23.732,4.938,16,4.938zM16.868,21.375h-1.969v-1.889h1.969V21.375zM16.772,18.094h-1.777l-0.176-8.083h2.113L16.772,18.094z");
            this._markerSymbol.setColor(new Color("#00FFFF"));
            this._simpleFillSymbol = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([16, 16, 191]), 2),
                new Color([255, 255, 0, 0.25]));
            this._cpg3SR = new CapaGrafica3SR();
            this._dibujo = new Dibujo();
            this._cpg3SR.agregarMapa(this.mapa);
            this._dibujo.agregarMapa(this.mapa);
            this._areasAndLengthParams = new AreasAndLengthsParameters();
            on(this._dibujo, "dibujo-complete", lang.hitch(this, this._dibujoComplete));
            this.set("loaded", true);
            this.emit("load", {});
            server = "http://web.renare.gub.uy/arcgis/rest/services/Utilities/Geometry/GeometryServer";
            this._geometryService = new GeometryService(server);
            this._geometryService.on("area-and-lengths-complete", lang.hitch(this, this._outputAreaAndLength));
            this._areasAndLengthParams.areaUnit = GeometryService.UNIT_ACRES;
            this._areasAndLengthParams.calculationType = "geodesic";
            this._gpCroquis = new Geoprocessor("http://web.renare.gub.uy/arcgis/rest/services/CONEAT/gpCroquisAreas/GPServer/CroquisAreas");
            //Rueda de espera
            this._standbyAreas = new Standby({target: this._ruedaEspera});
            domConstruct.place(this._standbyAreas.domNode, this._ruedaEspera, "after");
            this._standbyAreas.startup();
            checkBox = new CheckBox({
                name: "checkBox",
                value: "",
                checked: false,
                onChange: lang.hitch(this, function (b) {
                    this._mantenerGeom = b;
                })
            }, this._mantenerGeo).startup();
        },
        _desmarcarDibujoSeleccionado: function () {
            this._msgAgregarArea.innerHTML = " ";
        },
        _removerDibujoSeleccionado: function () {
            this._i = this.i - 1;
            this._msgAgregarArea.innerHTML = " ";
        },
        _croquis: function () {
            if (this._i === 0) {
                this._msgAgregarArea.innerHTML = this._i18n.widgets.AreasConeatWidget.msgAgregarArea;
            } else {
                this._msgAgregarArea.innerHTML = " ";
                var g, area, featureSet, parametros, areas = [];
                for (area in this._cpg3SR._gs) {
                    if (this._cpg3SR._gs.hasOwnProperty(area)) {
                        g = this._cpg3SR._gs[area].grafico(wkids.UTM);
                        g.setAttributes({
                            OBJECTID: 0,
                            ID: area,
                            Shape_Length: 0,
                            Shape_Area: 0
                        });
                        areas.push(g);
                    }
                }
                featureSet = new FeatureSet();
                featureSet.features = areas;
                parametros = {
                    Clase_Areas: featureSet
                };
                this._standbyAreas.show();
                this._gpCroquis.submitJob(parametros, lang.hitch(this, this._gpCroquisComplete));
            }
        },
        _gpCroquisComplete: function (jobInfo) {
//            this._standbyAreas.show();
            this._gpCroquis.getResultData(jobInfo.jobId, "Croquis", lang.hitch(this, this._gpCroquisResultDataCallBack), lang.hitch(this, this._gpCroquisResultDataErr));
        },
        _gpCroquisResultDataCallBack: function (value) {
            this._standbyAreas.hide();
            window.open(value.value.url);
        },
        _gpCroquisResultDataErr: function (err) {
            console.log(err.message);
        },
        _initDibujo: function () {
            this._msgAgregarArea.innerHTML = "Dibuje el area en el mapa, doble clic para finalizar";
            this._dibujo.activar(Draw.POLYGON);
            this._cpg3SR.seleccionarGraficoClickeado();
        },
        _outputAreaAndLength: function (evt) {
            var aux = evt.areas[0];
            if (aux > 40000) {
                this._cpg3SR.removerGrafico(" " + this._i);
                this._msgAgregarArea.innerHTML =  "El área no puede ser mayor a 40000ha";
            }
        },
        _cancelarAgregarDibujo: function () {
            this._dibujo.desactivar();
            this._msgAgregarArea.innerHTML = " ";
        },
        _eliminarDibujos: function () {
            this._i = 0;
            this._cpg3SR.limpiar();
            this._msgAgregarArea.innerHTML = " ";
        },
        _dibujoComplete: function (evt) {
            this._i = this._i + 1;
            var g;
            g = new Graphic(evt.geometry, this._simpleFillSymbol);
            this._cpg3SR.agregarGrafico(" " + this._i, g);
            this._areasAndLengthParams.polygons = [evt.geometry];
            this._geometryService.areasAndLengths(this._areasAndLengthParams, lang.hitch(this, this._outputAreaAndLength));
        },
        _seleccionarGraficoClickeado: function () {
            this._msgAgregarArea.innerHTML = " ";
        },
        _dibujoEnabledChanged: function () {
            this.emit("dibujo-enabled-changed", {});
        },
        _desactivarDibujo: function () {
            this._dibujo.desactivar();
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



