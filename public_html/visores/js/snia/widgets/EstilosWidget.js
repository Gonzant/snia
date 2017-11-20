/*
 * js/snia/widgets/EstilosWidget
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
    "dojo/text!./templates/EstilosWidget.html",
    "dojo/i18n!../js/snia/nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/layout/TabContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dijit/form/CurrencyTextBox",
    "dojo/store/Memory",
    "dijit/tree/ObjectStoreModel",
    "dijit/Tree",
    "dijit/MenuBar",
    "dijit/PopupMenuBarItem",
    "dijit/Menu",
    "dijit/MenuItem",
    "dijit/DropDownMenu",
    "dijit/PopupMenuItem",
    "dijit/form/TextBox",
    "dijit/form/Select",
    "dijit/form/NumberSpinner",
    "dijit/form/MultiSelect",
    "dijit/form/HorizontalSlider",
    "dijit/form/Button",
    "dijit/form/SimpleTextarea",
    "dijit/form/ToggleButton",
    "dijit/form/CheckBox",
    "dijit/Tooltip",
    "dojo/dom"
], function (Evented, declare, lang,_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, TabContainer, ContentPane, BorderContainer, CurrencyTextBox,
    Memory, ObjectStoreModel, Tree, MenuBar, PopupMenuBarItem, Menu, MenuItem,
    DropDownMenu, TextBox, Select, NumberSpinner,
    HorizontalSlider, Button, SimpleTextarea, ToggleButton,
    CheckBox, Tooltip, dom) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: true,
        resize : function () {
            if (this._tabEstilos) {
                this._tabEstilos.resize();
            }
            if (this._tc) {
                this._tc.resize();
            }
            if (this._tabMixto) {
                this._tabMixto.resize();
            }
            if (this._bcEstilos) {
                this._bcEstilos.resize();
            }
            if (this._bc) {
                this._bc.resize();
            }
            if (this.topContentPane) {
                this.topContentPane.resize();
            }
        },
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
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('EstilosWidget::requiere un mapa');
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
            this._tabEstilos.startup();
            //tab programatic: 
            this._tc = new TabContainer({
                title: "Tab Programatic",
                style: "height: 100px; width: 300px;"
            }, this._tabProgramatic);
            this._cp1 = new ContentPane({
                title: "CP 1",
                content: "Contenido 1"
            });
            this._tc.addChild(this._cp1);
            this._cp2 = new ContentPane({
                title: "CP 2",
                content: "Contenido 2"
            });
            this._tc.addChild(this._cp2);
            this._cp3 = new ContentPane({
                title: "CP 3",
                content: "Contenido 3"
            });
            this._tc.addChild(this._cp3);
            this._tc.startup();
            //fin tab programatic
            //tab mixto: 
            this._tabMixto.addChild(this._cp1);
            this._tabMixto.addChild(this._cp2);
            this._tabMixto.addChild(this._cp3);
            this._tabMixto.startup();
            /*codigo para menu programatic */
            this._pMenuBar = new MenuBar({});
            this._pSubMenu = new DropDownMenu({});
            this._pSubMenu.addChild(new MenuItem({
                label: "File item #1"
            }));
            this._pSubMenu.addChild(new MenuItem({
                label: "File item #2"
            }));
            this._pMenuBar.addChild(new PopupMenuBarItem({
                label: "File",
                popup: this._pSubMenu
            }));
            this._pSubMenu2 = new DropDownMenu({});
            this._pSubMenu2.addChild(new MenuItem({
                label: "Cut",
                iconClass: "dijitEditorIcon dijitEditorIconCut"
            }));
            this._pSubMenu2.addChild(new MenuItem({
                label: "Copy",
                iconClass: "dijitEditorIcon dijitEditorIconCopy"
            }));
            this._pSubMenu2.addChild(new MenuItem({
                label: "Paste",
                iconClass: "dijitEditorIcon dijitEditorIconPaste"
            }));
            this._pMenuBar.addChild(new PopupMenuBarItem({
                label: "Edit",
                popup: this._pSubMenu2
            }));
            this._pMenuBar.placeAt("_menu");
            this._pMenuBar.startup();
            /*codigo de tree*/
            this._myStore = new Memory({ data: [
                { id: 'world', name: 'The earth', type:'planet', population: '6 billion'},
                { id: 'AF', name: 'Africa', type: 'continent', population: '900 million', area: '30,221,532 sq km',
                    timezone: '-1 UTC to +4 UTC', parent: 'world'},
                { id: 'EG', name: 'Egypt', type: 'country', parent: 'AF' },
                { id: 'KE', name: 'Kenya', type: 'country', parent: 'AF' },
                { id: 'Nairobi', name: 'Nairobi', type: 'city', parent: 'KE' },
                { id: 'Mombasa', name: 'Mombasa', type: 'city', parent: 'KE' },
                { id: 'SD', name: 'Sudan', type: 'country', parent: 'AF' },
                { id: 'Khartoum', name: 'Khartoum', type: 'city', parent: 'SD' },
                { id: 'AS', name: 'Asia', type: 'continent', parent: 'world' },
                { id: 'CN', name: 'China', type: 'country', parent: 'AS' },
                { id: 'IN', name: 'India', type: 'country', parent: 'AS' },
                { id: 'RU', name: 'Russia', type: 'country', parent: 'AS' },
                { id: 'MN', name: 'Mongolia', type: 'country', parent: 'AS' }
            ],
                getChildren: function (object){ return this.query({parent: object.id}); }
                });
            // Create the model
            this._myModel = new ObjectStoreModel({
                store: this._myStore,
                query: {id: 'world'}
            });
            // Create the Tree.
            this._tree = new Tree({
                model: this._myModel
            });
            this._tree.placeAt("_tree");
            this._tree.startup();
            /*fin de tree*/
            /*NumberSpinner  */
            this._mySpinner = new NumberSpinner({
                value: 1000,
                smallDelta: 10,
                constraints: { min: 9, max: 1550, places: 0 },
                id: "integerspinner3",
                style: "width:100px"
            }, "spinnerId");
            this._mySpinner.startup();
            /*Fin NumberSpinner  */
            this._myTextBox = new dijit.form.TextBox({
                name: "firstname",
                value: ""/* no or empty value! */,
                placeHolder: "type in your name"
            }, "firstname");
            /*Horizontal Slider*/
            var slider = new HorizontalSlider({
                name: "slider",
                value: 5,
                minimum: -10,
                maximum: 10,
                intermediateChanges: true,
                style: "width:300px;",
                onChange: function (value) {
                    dom.byId("sliderValue").value = value;
                }
            }, "slider").startup();
            new ToggleButton({
                showLabel: true,
                checked: false,
                onChange: function (val) {this.set('label', val); },
                label: "false"
            }, "programmatic").startup();
            /*ToolTips*/
            new Tooltip({
                connectId: ["tTbtnMapaBase"],
                label: "Mapa Base" + "Permite seleccionar el mapa base" 
            });
            /*CheckBox*/
            var checkBox = new CheckBox({
                name: "checkBox",
                value: "De acuerdo",
                checked: false,
                onChange: function (b) {
                    alert('onChange called with parameter = ' + b + ', and widget value = ' + this.get('value') ); }
            }, "checkBox").startup();
           /*Tree CheckBox*/
            this._treeHerramientas = new Memory({ data: [
                { id: 'herramientas', name: 'Herramientas', type : 'padre'},
                { id: 'MB', name: 'Mapa Base', type: 'hijo', parent : 'herramientas'},
                { id: 'N', name: 'Navegar', type: 'hijo', parent : 'herramientas'},
                { id: 'I', name: 'Identificar', type: 'hijo', parent : 'herramientas'},
                { id: 'BP', name: 'Buscar Problemas', type: 'hijo', parent : 'herramientas'},
                { id: 'M', name: 'Medir', type: 'hijo', parent : 'herramientas'},
                { id: 'C', name: 'Coordenadas', type: 'hijo', parent : 'herramientas'},
                { id: 'I', name: 'Imprimir', type: 'hijo', parent : 'herramientas'}
            ],
                getChildren: function (object) {return this.query({parent: object.id}); }
                });
            // Create the model
            this._myModel = new ObjectStoreModel({
                store: this._treeHerramientas,
                query: {id: 'herramientas'}
            });
            // Create the Tree.
            this._tree = new Tree({
                model: this._myModel,
                checkedRoot: true,
                persist: false,
                //openOnClick: true,
                getIconClass: function (item, opened) {
//                    console.log('tree getIconClass', item, opened);
//                    console.log('tree item type', item.type);
                },
                onClick: function (item, node) {
                    node._iconClass = "dijitFolderClosed";
                    node.iconNode.className = "dijitFolderClosed";
                    console.log(node.domNode.id);
                    var id = node.domNode.id, isNodeSelected = node.checkBox.get('checked');
                    console.log(isNodeSelected);
                    dojo.query('#' + id + ' .dijitCheckBox').forEach(function (node) {
                        dijit.getEnclosingWidget(node).set('checked', isNodeSelected);
                    });
                },
                _createTreeNode: function(args) {
                    var tnode, cb ;
                    tnode = new dijit._TreeNode(args);
                    tnode.labelNode.innerHTML = args.label;
                    console.log(args);
                    cb = new CheckBox();
                    cb.placeAt(tnode.labelNode, "first");
                    tnode.checkBox = cb;
                    return tnode;
                }
            });
            this._tree.placeAt(this._bcA);
            this._tree.startup();
//            //CODIGO BORDER CONTAINER
//            
//            var bc;
//            /*Border Container*/
//            bc = new dijit.layout.BorderContainer({
//                design: "headline",
//                style: "height:400px;width:400px;border:solid 1px"
//            });
//            // create a ContentPane as the left pane in the BorderContainer
//            var topContentPane = new dijit.layout.ContentPane(
//                    {
//                        region: "top",
//                        style: "background-color:yellow;height:100px; width: 100px;",
//                        splitter: true,
//                        minSize : 10,
//                        maxSize : 100
//                    } ,
//                    document.createElement("div")
//            );
//            var centerContentPane = new dijit.layout.ContentPane(
//                    {
//                        style: "background-color:blue;height:10px; width: 100px;",
//                        region: "center"
//                       
//                    } //,
//                    //document.createElement("div")
//                );
//
//                var bottomContentPane = new dijit.layout.ContentPane(
//                    {
//                        region: "bottom",
//                        style: "background-color:red;height:20px; width: 10px;"
//                        
//                    },
//                    document.createElement("div")
//                );
//               
//                
//
//                //now add the children.
//                bc.addChild(topContentPane);
//                bc.addChild(centerContentPane);
//                bc.addChild(bottomContentPane);
//                // this.bc.resize(); 
//                
//                bc.placeAt(this._estiloPrueba);
//                bc.startup(  ); // do initial layout (even though there are no children)
//               
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









