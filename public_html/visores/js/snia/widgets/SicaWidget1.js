/*
 * js/snia/widgets/SicaWidget1
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
    "dojo/text!./templates/SicaWidget1.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "esri/graphic",
    "modulos/Grafico3SR",
    "dojo/store/Memory",
    "dijit/tree/ObjectStoreModel",
    "dojox/form/CheckedMultiSelect",
    "dojo/store/DataStore",
    "dijit/form/Select",
    "dijit/form/MultiSelect",
    "modulos/wkids",
    "dojo/dom",
    "dojo/_base/window", "dojo/domReady!"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle,
    Graphic, Grafico3SR, Memory, ObjectStoreModel, CheckedMultiSelect, DataStore, Select, MultiSelect, wkids, dom, win) {
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
            this.set("_data", defaults.config.data);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
               // baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this._cargarDOM();
            }
            
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('SicaWidget1::requiere un mapa');
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
         //   this._mapMouseMoveListener.remove();
            this.inherited(arguments);
        },
        
        _cargarDOM: function () {
             var memoryStore = new Memory({
                  data: this._data
             });
//             
////             var select = new Select({
////                store: memoryStore,
////                style: "width: 50px;"
////            }, "stateSelect");
////           
//            var select = new Select({
//                store: memoryStore                
//            }, "stateSelect");
//            select.startup();
           // var sel = dom.byId('dynamic');
            var n = 0;
            for(var i in this._data){
                var c = win.doc.createElement('option');
                c.innerHTML = this._data[i][i];
                c.value = n++;
                if(this._data[i].esta === true)
                    this.dynamic.appendChild(c);
            }
            var myMultiSelect = new MultiSelect({ name: 'dynamic', multiple: 'true' }, this.dynamic).startup();
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
           // this._mapMouseMoveListener.remove();
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
