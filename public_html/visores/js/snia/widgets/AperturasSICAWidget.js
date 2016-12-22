/*
 * js/snia/widgets/AperturasSICAWidget
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
    "dojo/text!./templates/AperturasSICAWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/store/Memory",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "esri/graphic",
    "modulos/Grafico3SR",
    "modulos/wkids",
    "dojo/domReady!"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, domConstruct,
    Memory, Tree, ObjectStoreModel, ContentPane,
    Graphic, Grafico3SR, wkids) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: true,
         resize : function () {
            if (this._bcAperturas) {
                this._bcAperturas.resize();
            }
             if (this._cpIzq) {
                this._cpIzq.resize();
            }
            if (this._cpIzqSC) {
                this._cpIzqSC.resize();
            }
        },
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            data: null,
            aperturas: null
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
            
            this._data = defaults.data;
            this._aperturas = defaults.aperturas;
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
               
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('AperturasSICAWidget::requiere un mapa');
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
        desactive : function () {
//            this._mapMouseMoveListener.remove();
        },
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
        
         _cargarJSON: function() {
            var bD1, bI1, div1, div2;
            bD1 = new ContentPane({  //Derecho
                region: "center",
                style: "height: 400px;"
            });
            this._cpDerSC.addChild(bD1);
            bI1 = new ContentPane({ //Izquierdo
                region: "center",
                style: "width: 180px; height: 400px;"
            });
            this._cpIzqSC.addChild(bI1);
            div1 = domConstruct.create('div', {}, bI1.containerNode);
            div2 = domConstruct.create('div', {}, bD1.containerNode);  
           this._store = new Memory({
                data: [{ name: "raiz", id: "root"}],
                getChildren: function (object) {
                    return this.query({parent: object.id});
                }
            });
            for (var i = 0; i < this._aperturas.length; i = i+1){                
                this._store.put({id: i, name: this._aperturas[i].label, parent: "root", nodo: "raiz" });
            }            
            
            this._myModel = new ObjectStoreModel({
                store: this._store,
                query: {id:  "root"}
            });
             this._tree = new Tree({
                model: this._myModel,
                showRoot: false,
                getIconClass: function () {
                    return "custimg";
                }
            });                     
            this._tree.placeAt(div1);
            this._tree.startup();         
            
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
            this._cargarJSON();
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
