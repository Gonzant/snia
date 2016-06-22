/*
 * js/snia/widgets/MapasReferenciaWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */

define([    
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    "dojo/text!./templates/MapaReferenciaWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/dijit/OverviewMap"
], function (on, Evented, declare, lang, arrayUtil,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, i18n, domClass, domStyle, domConstruct,
    ArcGISTiledMapServiceLayer, OverviewMap) {
    //"use strict";
var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        resize : function () {
            if (this._overviewMapDijit) {
                this._overviewMapDijit.resize(1,1);
            }
        },
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            active: false,
            config: {}
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            this._botones = [];
            this._mapasBase = [];
            //propiedades
            this.set("mapa", defaults.mapa);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("config", defaults.config);
            this.set("active", defaults.active);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._active);
            this.watch("prueba", this._reload);
            this._overviewMapDijit = [];
            // classes
            this._css = {
//                baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                //var tr, td, boton, label;
                if (this.config.mapasBase) {
                    this._mapasBase = this.config.mapasBase;
                }
        
              /*  arrayUtil.forEach(this._mapasBase, lang.hitch(this, function (item, index) {
                    if (index % 4 === 0) {
                        //Cada cuatro mapas creo una fila nueva
                        tr = domConstruct.create("tr");
                        domConstruct.place(tr, this._mapasBaseNode);
                    }
                    //Una celda para cada mapa
                    td = domConstruct.create("td");
                    domConstruct.place(td, tr);
                   
//                    //boton para seleccionar mapa
                    boton = new Button({
                        id: item.nombre,
                        disabled: false,
                        innerHTML: '<button class="BigButtonMapaBase"><img src=' + item.icono + ' height="65" width="65"> <br>' + item.nombre,
                        name: "mapasBaseOptions"
                    });
                    boton.placeAt(td).startup();
                    
                    this._botones.push(boton);
                    
                    //Cargo el mapa base para el boton
                    item.map = new ArcGISTiledMapServiceLayer(this._mapasBase[index].url);
                    //Listener para click en el boton    
                    this.own(on(boton, a11yclick, lang.hitch(this, function () {
                        boton.set('visible', false);
                        this.mapa.setMapaBase(item.map);
                        
                    })));
                }));*/
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('MapasReferenciaWidget::requiere un mapa');
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
            lang.hitch(this,this._initOverviewMap());

            this._active();
            this.emit("load", {});
            
                on(this.mapa, "prueba", lang.hitch(this, this._reload))
               ;
       
        },
        _initOverviewMap: function (){
            this._overviewMapDijit = new OverviewMap({
            map: this.mapa.map,
            visible: true,
            expandFactor: 3,            
            height: 150,
            width: 150
            },this._mapasRefNode);
            this._overviewMapDijit.startup();
            this._overviewMapDijit.resize(1,1);
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _active: function () {
            if (this.get("active")) {
                //alert("ddddddddd");
                //this.show();
                //this.destroy();
            } else {
               //this.startup();
               //this._init();
                    //this.hide();
                    //alert("ccccccccccccc");
            }
            this.emit("active-changed", {});
        },
        _reload: function (){
       
            this._overviewMapDijit.destroy();
            
            //lang.hitch(this,this._initOverviewMap());
            this._initOverviewMap();
       
           
        }
    });
    return widget;
});

 
