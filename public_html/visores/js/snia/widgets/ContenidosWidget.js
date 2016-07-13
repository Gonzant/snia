/*
 * js/snia/widgets/ContenidosWidget
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
    "dojo/text!./templates/ContenidosWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class", 
    "dojo/dom-style",
    "dojo/query",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    "agsjs/dijit/TOC",
    "dijit/Tooltip",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/fx",
    "dojox/layout/ScrollPane",
    "dojo/NodeList-traverse",
    "dojo/domReady!"
], function (on,
    Evented, declare, lang, arrayUtil, template, i18n, domClass, domStyle, query,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick, TOC, Tooltip) {

    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
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
            this._dynamicMapServiceLayers = [];
            this._toc = [];
            this._firstActive = true;
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
            // classes
            this._css = {
                //baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                
                this.own(
                    on(this._colapsarNode, a11yclick, lang.hitch(this, this._colapsarClick)),
                    on(this._expandirNode, a11yclick, lang.hitch(this, this._expandirClick))
                );
        
                if (this.config.dynamicMapServiceLayers) {
                    this._dynamicMapServiceLayers = this.config.dynamicMapServiceLayers;
                }
                this._loadDynamicMapServiceLayers();
            }
        
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('ContenidosWidget::requiere un mapa');
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
            var ttColapsar, ttExpandir;
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
             
            //Tooltip para botón colapsar
            ttColapsar= new Tooltip({
                connectId: [this._colapsarNode.domNode],
                label: "Colapsar",
                position: ['above']               
            });
                      
            //Tooltip para botón colapsar
            ttExpandir= new Tooltip({
                connectId: [this._expandirNode.domNode],
                label: "Expandir Todo",
                position: ['below']
            });
            
            this._active();
            
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _loadDynamicMapServiceLayers: function () {
            var dynaLayersInfo;
            dynaLayersInfo = [];
            arrayUtil.forEach(this.mapa.map.layerIds, lang.hitch(this, function (item, index) {
                var l;
                l  = this.mapa.map.getLayer(item);
                if (index > 0) {//0 es mapa base
                    dynaLayersInfo.push({layer: l, title: l.id, collapsed: true, slider: true});
                }
            }));
            dynaLayersInfo.reverse(); //Mostrar las capas en el orden de la configuracion
            this._toc = new TOC({
                map: this.mapa.map,
                style: "inline",
                layerInfos: dynaLayersInfo
            }, this.tocDiv);
            this._toc.startup();
        },
        _active: function () {
            //FIXME
            this.emit("active-changed", {});
            this._fijarUbicacion();
        },
        _colapsarClick: function () {
            arrayUtil.forEach(this._toc._rootLayerTOCs, lang.hitch(this, function (item) {
                item._rootLayerNode.collapse();
            }));
        },
        _expandirClick: function () {
            arrayUtil.forEach(this._toc._rootLayerTOCs, lang.hitch(this, function (item) {
                item._rootLayerNode.expand();
            }));
        },
        _expandirSeleccionadosClick: function () {
            arrayUtil.forEach(this._toc._rootLayerTOCs, lang.hitch(this, function (item) {
                if (item._rootLayerNode.data.visible === true) {
                    item._rootLayerNode.expand();
                }
            }));
        },
        _minimizar: function () {
            if (this.get("visible")) {
                this.hide();
            } else {
                this.show();
            }
        },
        _fijarUbicacion: function () {
            var cw = query("#" + this.domNode.id).parent().parent()[0];
            if (this._firstActive){
                this.own(on(query(".dijitDialogTitleBar",cw), a11yclick, lang.hitch(this, this._minimizar)));
                this._firstActive = false;
            }
           /*domStyle.set(cw, {
                top: '95px',
                left: '20px'
            });*/
        }        
    });
    return widget;
});
