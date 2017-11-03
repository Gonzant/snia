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
    "dojo/text!./templates/MetadataWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",    
    "dojo/on",    
    "dojo/dom-construct",
    "esri/request",
    "dijit/Dialog"
], function (Evented, declare, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, on,
    domConstruct, esriRequest, Dialog) {
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
            active: false,
            url:null
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
            this._url = defaults.url;
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
            this._init();                           
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
            lang.hitch(this, this._construirDialog(this._url));
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _construirDialog: function (url) {
            //Busco la leyenda sólo si no fue traida antes desde otro nodo
            var requestHandle = esriRequest({
                "url": url + "?f=pjson",
                "content": {
                    "f": "json"
                },
                "callbackParamName": "callback"
            });
            requestHandle.then(
                function (data) {                                
                    var tiempo = "";
                    var escala = "";
                    if (data.timeExtent){
                        tiempo = "<div>Tiempo desde: " + data.timeExtent.Extent[0] +"</div><br/>"
                        +"<div>Tiempo hasta: "+ data.timeExtent[1]+"</div><br/>";
                    }
                    if (data.minScale != 0 || data.minScale!=0){
                        escala = "<div>Mínima escala: " + data.minScale + "</div><br/>"
                        +"<div>Máxima escala:" + data.maxScale + "</div><br/>";
                    }
                    var node = domConstruct.toDom(
                        "<div>Nombre: " + data.name + "</div><br/>"
                        +"<div>Descripción: " + data.description + "</div><br/>"
                        +"<div>Fuente: " + data.copyrightText + "</div><br/>"
                        + escala
                        + tiempo                                 
                            );
                    var dialogo = new Dialog({
                        title : data.name,                            
                        content: node
                    });
                    dialogo.startup();
                    dialogo.show();
                },
                function (error) {
                    console.log("Error: ", error.message);
                }
            );                                                 
        }
    });
    return widget;
});