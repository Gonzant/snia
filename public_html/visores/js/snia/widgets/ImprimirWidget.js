/*
 * js/snia/widgets/ImprimirWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/on", "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/ImprimirWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/store/Memory",
    "dijit/form/ComboBox",
    "dijit/form/Button",
    "esri/tasks/PrintParameters",
    "esri/tasks/PrintTask",
    "esri/tasks/PrintTemplate",
    "dojo/_base/array",
    "dijit/TooltipDialog",
    "dijit/popup"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, Memory, ComboBox,
    Button, PrintParameters,
    PrintTask, PrintTemplate, array, TooltipDialog, popup
    ) {
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
            this.set("estilo", defaults.estilo);
            this.set("_urlPrintTask", defaults.config.urlPrintTask);
            this.set("_lbImprimir", defaults.config.lbImprimir);
            this.set("_lbImprimiendo", defaults.config.lbImprimiendo);
            this.set("_data", defaults.config.data);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._activar);
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
        },
        _activar: function () {
            this.emit("active-changed");
            if (this.get("active")) {
                this._cambioEscala();
            } else {
                popup.close(this._myTooltipDialog);
            }
        },
        postCreate: function () {
            this.inherited(arguments);
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('ImprimirWidget::requiere un mapa');
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
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _init: function () {
            this._visible();
            this._activar();
            this.set("loaded", true);
            this.emit("load", {});
            //Se crea el boton para imprimir
            this._crearBotonImprimir();
            //Se crean los templates
            this._crearTemplates();
            //Creo la tarea de imprimir
            this._printTask = new PrintTask(this._urlPrintTask);
            on(this.mapa.map, 'zoom-end', lang.hitch(this, this._cambioEscala));
        },
        _crearBotonImprimir : function () {
            this._myTooltipDialog = new TooltipDialog({
                style: "width: 300px;",
                content: "<p>Para imprimir el mapa realice menos zoom<p>"
            });
            if (this.estilo){
                this._botonImprimir = new Button({										  
                    showLabel: true,
                    label: "<i class=\"material-icons\" style=\"color: white\">print</i>  "+ this._lbImprimir ,
                    disabled: false,
                    onClick: lang.hitch(this, this._imprimirClick)
                });
            } else {
                this._botonImprimir = new Button({
                iconClass: "iconImprimir",
                showLabel: true,
                label: this._lbImprimir,
                disabled: false,
                onClick: lang.hitch(this, this._imprimirClick)
            });
            }
            

            this._imprimirNode.appendChild(this._botonImprimir.domNode);
            domStyle.set(this._imprimirNode, "margin-left", "122px");
            domStyle.set(this._imprimirNode, "margin-top", "5px");
        },
        _crearTemplates: function () {
            var templateStore;
            templateStore = new Memory({
                data: this._data
            });

            this._comboBoxImprimir = new ComboBox({
                name: "template",
                value: "A4 Vertical",
                store: templateStore,
                searchAttr: "name"
            });
            this._comboBoxImprimir.placeAt(this._divCombo);
        },
        _elegirTemplate: function (templateSelected) {
            var nuevoTemplate = new PrintTemplate();
            nuevoTemplate.preserveScale = true;
            array.forEach(this._data, function (hoja) {
                if (hoja.name === templateSelected) {
                    nuevoTemplate.exportOptions = {
                        width: hoja.width,
                        height: hoja.height,
                        dpi: hoja.dpi,
                        format: hoja.format,
                        layout : hoja.layout
                    };
                }
            });
            return nuevoTemplate;
        },
        _imprimirClick: function () {
            var templateImprimir, parametros;
            //Se selecciona el template que el usuario eligio           
            templateImprimir = this._elegirTemplate(this._comboBoxImprimir.value);
            parametros = new PrintParameters();
            parametros.template = templateImprimir;
            parametros.map = this.mapa.map;
            //Se desactiva el boton de imprimir
            this._botonImprimir.setAttribute("label", this._lbImprimiendo);
            this._botonImprimir.setAttribute("disabled", true);
            //Se ejecuta la tarea de imprimir
            this._printTask.execute(parametros, lang.hitch(this, this._imprimirCompletado), lang.hitch(this, this._imprimirError));
        },
        _imprimirCompletado: function (result) {
            window.open(result.url);
            this._hyperlinkClick();
        },
        _imprimirError: function (result) {
            console.log(result);
        },
        _eliminarHijos: function (domNode) {
            while (domNode.hasChildNodes()) {
                domNode.removeChild(domNode.lastChild);
            }
        },
        _hyperlinkClick: function () {
            this._eliminarHijos(this._imprimirNode);
            this._crearBotonImprimir();
        },
        _cambioEscala: function () {
            if (((this.mapa.baseMapLayer.url === "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer") || (this.mapa.baseMapLayer.url === "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer")) && (this.mapa.map.getZoom() > 17)) {
                this._botonImprimir.disabled = true;
                popup.open({
                    popup: this._myTooltipDialog,
                    around: this._botonImprimir.domNode
                });
            } else {
                popup.close(this._myTooltipDialog);
                this._botonImprimir.disabled = false;
            }
        }
    });
    return widget;
});