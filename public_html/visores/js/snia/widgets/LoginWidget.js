/*
 * js/snia/widgets/LoginWidget
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
    "dojo/text!./templates/LoginWidget.html",
    "dojo/i18n!../js/snia/nls/snianls.js",
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
            this.watch("visible", this._visible);
            this.watch("active", this._activar);
            on("signInDialog", lang.hitch(this, this._hideDialog)); 
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
               // this._mapMouseMoveListener = on(this.mapa.map, "mouse-move", lang.hitch(this, this._mapMouseMove));
                this.own(
                    on(this.mapa, "reload", lang.hitch(this, this._mapaReload))
                );
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
           
        },
        // connections/subscriptions se limpian durante la fase destroy()
        destroy: function () {
        // this._mapMouseMoveListener.remove();
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
        _activar: function () {
            //alert("activando");
            if (this.get("active")){                
                $( ".esriSignInDialog").show() ;     
                //this.set("active", false);
            }
            else{
                $( ".esriSignInDialog").hide() ;   
                //this.set("active", true);
            }
        },
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
         
       
        _visible: function () {
            if (this.get("visible")) {
                $( ".esriSignInDialog").hide() ;
            } else {
                $( ".esriSignInDialog").show() ;     
            }
        },
        _hideDialog: function () {
            $( ".esriSignInDialog").hide() ;
        } 
       
    });
    return widget;
});
