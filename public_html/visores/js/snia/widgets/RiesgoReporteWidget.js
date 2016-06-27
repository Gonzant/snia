/*
 * js/snia/widgets/RiesgoReporteWidget
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
    "dojo/text!./templates/RiesgoReporteWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/_base/array",
    "dijit/form/Button",
    "jspdf/jspdf.min"
], function (on, Evented, declare, lang, _WidgetBase, _TemplatedMixin,
    _WidgetsInTemplateMixin, template, i18n, domClass, domStyle, arrayUtil,
    Button) {
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
            titulo: null,
            coordenadas: null,
            etiquetasPredial: null,
            resultadoPredial: null,
            etiquetasGeo: null,
            etiquetasGeoU: null,
            resultadoGeo: null,
            resultadoAmbiental: null,
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
            //propiedades del json
            this.set("_botonAceptar", defaults.config.botonAceptar);
            this.set("_verde", defaults.config.verde);
            this.set("_amarillo", defaults.config.amarillo);
            this.set("_naranja", defaults.config.naranja);
            this.set("_rojo", defaults.config.rojo);
            this.set("_pdf", defaults.config.pdf);

            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._activar);
            // classes
            this._css = {
               // baseClassRadioButton: "sniaRadioButton"
            };
            this.titulo = defaults.titulo;
            this.coordenadas = defaults.coordenadas;
            this.etiquetasPredial = defaults.etiquetasPredial;
            this.resultadoPredial = defaults.resultadoPredial;
            this.etiquetasGeo = defaults.etiquetasGeo;
            this.etiquetasGeoU = defaults.etiquetasGeoU;
            this.resultadoGeo = defaults.resultadoGeo;
            this.resultadoAmbiental = defaults.resultadoAmbiental;
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(

                );
            }
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
            //Se construyen todas las ventanas y variables                        
            this._botonReporte = new Button({
                label: this._botonAceptar,
                disabled: false,
                onClick: lang.hitch(this, this._generarPDF)
            });
            this._reporteButtonNode.appendChild(this._botonReporte.domNode);
        },
        _letraColorTexto: function (letra) {
            var verde, amarillo, naranja, rojo, ret;
            verde = this._verde;
            amarillo = this._amarillo;
            naranja = this._naranja;
            rojo = this._rojo;
            ret = {color: null, texto: ''};
            ret.texto = letra;
            switch (letra) {
            case 'A':
                ret.color = rojo;
                ret.texto = 'Alto';
                break;
            case 'AA':
                ret.color = rojo;
                break;
            case 'AM':
                ret.color = amarillo;
                break;
            case 'AB':
                ret.color = amarillo;
                break;
            case 'M':
                ret.color = amarillo;
                ret.texto = 'Medio';
                break;
            case 'MA':
                ret.color = naranja;
                break;
            case 'MM':
                ret.color = amarillo;
                break;
            case 'MB':
                ret.color = verde;
                break;
            case 'B':
                ret.color = verde;
                ret.texto = 'Bajo';
                break;
            case 'BA':
                ret.color = naranja;
                break;
            case 'BM':
                ret.color = verde;
                break;
            case 'BB':
                ret.color = verde;
                break;
            }
            return ret;
        },
        _generarPDF: function () {
            var doc, columnaDerecha, columnaIzquierda, letraGrande, letraChica,
                fila, listEtiqPred, rp, rg, ra, listEtiqGeoU;
            doc = new jsPDF();
            //Init variables
            columnaDerecha = parseInt(this._pdf.columnaDerecha, 10);
            columnaIzquierda = parseInt(this._pdf.columnaIzquierda, 10);
            letraGrande = parseInt(this._pdf.letraGrande, 10);
            letraChica = parseInt(this._pdf.letraChica, 10);
            fila = parseInt(this._pdf.fila, 10);
            doc.setFont("helvetica");
            doc.setFontSize(11);
            doc.text(190, 5, this._pdf.mgap);

            doc.setFontType("bold");
            doc.setFontSize(letraGrande);

            doc.text(columnaIzquierda, fila, this.titulo);

            fila = fila + 10;
            doc.setFontSize(letraChica);
            doc.setFontType("normal");
            doc.text(columnaIzquierda, fila, this._pdf.dicose);
            doc.text(columnaDerecha, fila, this._dicoseInputNode.value);
            fila = fila + 10;

            doc.text(columnaIzquierda, fila, this._pdf.coordenadas);
            doc.text(columnaDerecha, fila, "(" + this.coordenadas + ")");
            fila = fila + 20;

            doc.setFontType("bold");
            doc.setFontSize(letraGrande);
            doc.text(columnaIzquierda, fila, this._pdf.infoPredial);
            fila = fila + 10;

            doc.setFontSize(letraChica);
            doc.setFontType("normal");
            listEtiqPred = this.etiquetasPredial.split(";");
            arrayUtil.forEach(listEtiqPred, lang.hitch(this, function (ep) {
                var aux = ep.split(":");
                if (aux[0] !== "") {
                    doc.text(columnaIzquierda, fila, aux[0]);
                    doc.text(columnaDerecha, fila, aux[1]);
                    fila = fila + 10;
                }
            }));
            fila = fila + 5;
            doc.setFontType("italic");
            doc.text(columnaIzquierda, fila, this._pdf.riesgo);

            rp = this._letraColorTexto(this.resultadoPredial);
            doc.setDrawColor(0);
            doc.setFillColor(rp.color[0], rp.color[1], rp.color[2]);
            doc.rect(columnaDerecha, fila - 6, 8, 8, 'FD');
            doc.text(columnaDerecha + 10, fila, rp.texto);
            fila = fila + 20;

            doc.setFontType("bold");
            doc.setFontSize(letraGrande);
            doc.text(columnaIzquierda, fila, this._pdf.infoGeo);
            fila = fila + 10;

            doc.setFontSize(letraChica);
            doc.setFontType("normal");

            listEtiqGeoU = this.etiquetasGeoU.split(";");
            arrayUtil.forEach(listEtiqGeoU, lang.hitch(this, function (eg) {
                var aux = eg.split(":");
                if (aux[0] !== "") {
                    doc.text(columnaIzquierda, fila, aux[0]);
                    doc.text(columnaDerecha, fila, aux[1]);
                    fila = fila + 10;
                }
            }));

            fila = fila + 5;
            doc.setFontType("italic");
            doc.text(columnaIzquierda, fila, this._pdf.riesgo);

            rg = this._letraColorTexto(this.resultadoGeo);
            doc.setDrawColor(0);
            doc.setFillColor(rg.color[0], rg.color[1], rg.color[2]);
            doc.rect(columnaDerecha, fila - 6, 8, 8, 'FD');
            doc.text(columnaDerecha + 10, fila, rg.texto);
            fila = fila + 20;

            doc.setFontType("bold");
            doc.setFontSize(22);
            doc.text(columnaIzquierda, fila, this._pdf.riesgoAmbiental);

            ra = this._letraColorTexto(this.resultadoAmbiental);
            doc.setDrawColor(0);
            doc.setFillColor(ra.color[0], ra.color[1], ra.color[2]);
            doc.rect(columnaDerecha, fila - 6, 8, 8, 'FD');
            doc.text(columnaDerecha + 10, fila, ra.texto);
            fila = fila + 10;

            doc.save(this._pdf.nombrePdf);
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



