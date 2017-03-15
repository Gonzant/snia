/*
 * js/snia/widgets/RiesgoInformacionWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/RiesgoInformacionWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/_base/array",
    "dojo/on",
    "dijit/layout/TabContainer",
    "dojo/dom-construct",
    "dijit/layout/ContentPane"
], function (Evented, declare, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, arrayUtil, on,
    TabContainer, domConst, ContentPane) {
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
            json: null,
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
            this.watch("active", this._activar);
            // classes
            this._css = {
               // baseClassRadioButton: "sniaRadioButton"
            };
            this._json = defaults.json;
        },
        _activar: function () {
            this.emit("active-changed");
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(

                );
            }
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('RiesgoInformacionWidget::requiere un mapa');
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
            lang.hitch(this, this._construirVentanas());
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _construirVentanas: function () {
            this._tabContainerInfo = new TabContainer({
                title: "Tab Programatic Informacion",
                style: "height: 500px; width: 500px;"
            }, this._riesgoInfoTabContainerNode);

            arrayUtil.forEach(this._json.Seccion, lang.hitch(this, function (secJson) {
                var node, nodeNombre, nodeTexto, nodeValor;
                node = domConst.create("div");
                arrayUtil.forEach(secJson.NombreValorTexto, lang.hitch(this, function (nvtJson) {
                    var nodeSeccion = domConst.create("div");
                    if (nvtJson.Nombre) {
                        nodeNombre = domConst.toDom("<div>" + nvtJson.Nombre + "</div>");
                        domConst.place(nodeNombre, nodeSeccion);
                        domStyle.set(nodeNombre, "font-size", "16px");
                        domStyle.set(nodeNombre, "font-weight", "bold");
                        domStyle.set(nodeNombre, "margin-top", "10px");
                        domStyle.set(nodeNombre, "margin-left", "10px");
                        domStyle.set(nodeNombre, "margin-bottom", "5px");
                    }
                    if (nvtJson.Texto) {
                        nodeTexto = domConst.toDom("<div>" + nvtJson.Texto + "</div>");
                        domConst.place(nodeTexto, nodeSeccion);
                        domStyle.set(nodeTexto, "margin-left", "10px");
                        domStyle.set(nodeTexto, "margin-right", "10px");
                        domStyle.set(nodeTexto, "margin-bottom", "5px");
                    }
                    if (nvtJson.Valor) {
                        nodeValor = domConst.toDom("<div><a href=" + nvtJson.Valor + " target=\"_blank\">(enlace)</a></div>");
                        domStyle.set(nodeValor, "margin-left", "10px");
                        domStyle.set(nodeValor, "margin-right", "10px");
                        domConst.place(nodeValor, nodeSeccion);
                    }
                    domStyle.set(nodeSeccion, "margin-bottom", "10px");
                    domConst.place(nodeSeccion, node);
                }));

                this._nodeChildInfo = new ContentPane({
                    title: secJson.Nombre,
                    content: node
                });
                this._tabContainerInfo.addChild(this._nodeChildInfo);
            }));

            var node = domConst.create("div");
            domConst.place(domConst.toDom("<br/><div><b>Riesgo Ambiental</b></div>"), node);
            this._tabContainerInfo.startup();
        }
    });
    return widget;
});