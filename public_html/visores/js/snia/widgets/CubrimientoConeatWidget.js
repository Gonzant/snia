/*
 * js/snia/widgets/CubrimientoConeatWidget
 
 */
/*global define, console, dijit*/
/*jslint nomen: true */
define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/CubrimientoConeatWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "modulos/wkids",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/SpatialReference",
    "dojo/_base/array",
    "dijit/a11yclick",
    "dojo/on",
    "dojox/widget/Standby",
    "dojo/dom-construct"
], function (Evented, declare, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, wkids, Query, QueryTask, SpatialReference, arrayUtil, a11yclick, on,
    Standby, domConstruct) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            capa: null,
            padrones: null
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
            this.watch("active", this._activar);
            this.watch("dibujoEnable", this._dibujoEnabledChanged);
            // classes
            this._css = {
               // baseClassRadioButton: "sniaRadioButton"
            };
            this._capa = defaults.capa;
            this._padrones = defaults.padrones;
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(
                    on(this._pdfCubrimiento, a11yclick, lang.hitch(this, this._pdfClick)),
                    on(this._txtCubrimiento, a11yclick, lang.hitch(this, this._txtClick))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('CubrimentoConeatWidget::requiere un mapa');
                }
                this._init();
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
        _dibujoEnabledChanged: function () {
            this.emit("dibujo-enabled-changed", {});
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
            this.emit("load", {});
            this._queryTask = new QueryTask("http://web.renare.gub.uy/arcgis/rest/services/CONEAT/" + this._capa + "/MapServer/0");
            this._query = new Query();
            this._query.outSpatialReference = new SpatialReference(wkids.UTM);
            this._query.returnGeometry = false;
            this._query.outFields = ["*"];
            this._query.where = this._padrones;
            this._queryTask.execute(this._query, lang.hitch(this, this._queryTaskCallback),
                lang.hitch(this, this._queryTaskErrback));
            this._standby = new Standby({target: this._basic2});
            domConstruct.place(this._standby.domNode, this._basic2, "after");
//            document.body.appendChild(this._standby.domNode);
            this._standby.startup();
            this._standby.show();
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _queryTaskCallback: function (results) {
            this._padrones = results;
            var area, demo = this._areas, anterior = null;
            if (results.features.length > 0) {
                arrayUtil.forEach(results.features, lang.hitch(this, function (feature, index) {
                    area = (feature.attributes.Shape_Area * 100 / feature.attributes.ELEM_AREA).toFixed(2);
                    if ((feature.attributes.ID2 !== anterior)) {
                        this._areas.innerHTML += "<label class='mediumText'> " + feature.attributes.PADRON + " </label>";
                        demo.innerHTML += "<br></br>";
                    }
                    anterior = feature.attributes.ID2;
                    this._areas.innerHTML += "<label class='smallText'> " + feature.attributes.SC + " " + area + "%" + " </label>";
                    demo.innerHTML += "<br></br>";
                    indice = feature.attributes.NOMDEPTO + '-' + feature.attributes.PADRON;
                }));
            }
            this._standby.hide();
        },
        _queryTaskErrback: function (err) {
//            this._standby.hide();
            return null;
        },
        _pdfClick : function () {
            var results, primero, anterior, area, doc;
            doc = new jsPDF();
            doc.setFont("helvetica");
            results = this._padrones;
            primero = 0;
            anterior = null;
            primero = 20;
            if (results.features.length > 0) {
                arrayUtil.forEach(results.features, lang.hitch(this, function (feature, index) {
                    area = (feature.attributes.Shape_Area * 100 / feature.attributes.ELEM_AREA).toFixed(2);
                    if ((feature.attributes.ID2 !== anterior)) {
                        doc.setFontType("bold");
                        doc.text(20,  primero, feature.attributes.PADRON.toString());
                        primero += 10;
                    }
                    anterior = feature.attributes.ID2;
                    doc.setFontType("normal");
                    doc.text(feature.attributes.SC + " " + area + "%", 20, primero);
                    primero += 10;
                }));
            }
            doc.save('CubrimientoConeat.pdf');
        },
        _txtClick : function () {
            var area, pom, texto, anterior, results = this._padrones;
            anterior = null;
            texto = "";
            if (results.features.length > 0) {
                arrayUtil.forEach(results.features, lang.hitch(this, function (feature, index) {
                    area = (feature.attributes.Shape_Area * 100 / feature.attributes.ELEM_AREA).toFixed(2);
                    if ((feature.attributes.ID2 !== anterior)) {
                        texto += feature.attributes.PADRON.toString() + '\r\n';
                    }
                    anterior = feature.attributes.ID2;
                    texto += feature.attributes.SC + " " + area + "%" + "\r\n"}));
            }
            pom = document.createElement('a');
            pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(texto));
            pom.setAttribute('download', "CubrimientoConeat.txt");
            if (document.createEvent) {
                var event = document.createEvent('MouseEvents');
                event.initEvent('click', true, true);
                pom.dispatchEvent(event);
            } else {
                pom.click();
            }
        }
    });
    return widget;
});



