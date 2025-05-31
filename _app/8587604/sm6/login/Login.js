if (typeof SM6 === 'undefined') {
    var SM6 = {};
}

/**
 * Login SM6
 */
SM6.Login = (function () {
    "use strict";

    //Declare variables used
    var popUpStateCondition, objFancyBoxSettings, popUpElm;
    var urlLocation = document.location;
    var loginHost = 'http://' + urlLocation.host;
    var fancyBoxClassName = 'loginpopup';

    //object conditions of login functionality
    var objConditions = {login: "login", restricted: "restricted", loginClick: "loginClick"};

    return {

        initialised: false,
        /**
         * constructor
         * @param condition - pass the condition required or if none is found url will be checked
         */
        init: function (condition, params) {
            if (!this.initialised) {
                $(document).ready(function () {
                    $('a[href="/login"]').addClass(fancyBoxClassName);
                    $('a[href="/login?preview=Y"]').addClass(fancyBoxClassName);
                    condition = condition || SM6.Login.getStateViewCondition();
                    SM6.Login.createPopupElement();
                    objFancyBoxSettings = SM6.Login.getPopUpSettings(condition, params);
                    popUpElm = $('.'+fancyBoxClassName).fancybox(objFancyBoxSettings);
                    if (condition === "login" || condition === "restricted") {
                        SM6.Login.triggerPopUp(condition, popUpElm);
                    }
                });
                this.initialised = true;
            }
        },
        createPopupElement: function() {
            $('body').append($('<div class="login" style="display:none;"><a href="#" class="'+ fancyBoxClassName +'"></a></div>'));
        },
        /**
         * Trigger the popup on start based on the condition
         * @param condition
         * @param fancyBoxElm
         */
        triggerPopUp: function (condition, fancyBoxElm){
            if (objConditions[condition] ){
                fancyBoxElm.trigger('click');
            }
        },
        /**
         * - Checks if the condition is a valid login condition
         * @param condition
         * @return {Boolean}
         */
        matchPopUpCondition: function (condition){

            switch(condition){
                case objConditions.login:
                case objConditions.restricted:
                case objConditions.loginClick:
                    return true;
            }
            return false;

        },
        getStateViewCondition: function () {
           //Reads the url and checks if there is any conditions set
           var result = document.location.hash.match(/[#][a-z]*/gi);

           if (result){
               var condition = result.toString().replace('#','');
               if (SM6.Login.matchPopUpCondition(condition)){ return condition; }
               return false;
           }
           //If no conditions are found check the dom to check if any of the href requires popup functionality
           //With the set class name popup
           else if ($('a.'+fancyBoxClassName).length > 0) {
               $('a.'+fancyBoxClassName).click(function(e){ e.preventDefault(); });
               return objConditions.loginClick;
           }
           else {
               return false;
           }

        },

        /**
         * Returns back settings of what to show and interaction of fancybox and view
         * @param condition Login or Restricted
         * @param params Addition URL params for restriction condition
         * @return {Object}
         */
        getPopUpSettings:function (condition, params) {
            var iframeHeight;
            if ( condition == 'restricted' ) iframeHeight = 430;
            else iframeHeight = 340;

            var defaultFancyBoxLogin = {
                type:'iframe',
                href: loginHost + '/_login/start',
                iframe:{
                    scrolling:false,
                    preload:true
                },
                width: 352,
                height: iframeHeight,
                padding: 30,
                closeBtn:true,
                openEffect: 'none',
                helpers:{
                    overlay:{
                        css:{
                            cursor :'default',
                            'background' : 'rgba(0,0,0,0.6)'
                        },
                        closeClick:false
                    },
                    title:{ type:'inside' }
                },
                //this calls what action after fancybox has done its callback
                afterClose:function () {
                    SM6.Login.popUpCallback(SM6.Login.getActionCall());
                },
                wrapCSS:'sm-login-popup'

            };

            //Change defaultFancyBoxLogin settings depending on condition
            switch (condition) {
                case 'loginClick':
                    defaultFancyBoxLogin.openEffect = 'fade';
                    defaultFancyBoxLogin.helpers.overlay.closeClick = true;
                    defaultFancyBoxLogin.helpers.overlay.css.cursor = 'pointer';
                    break;
                case 'restricted':
                    defaultFancyBoxLogin.href = loginHost + '/_login/start' +'?type=restricted&'+params;
                    defaultFancyBoxLogin.closeBtn = false;
                    break;
            }
            return defaultFancyBoxLogin;
        },

        /**
         * Allow callbacks from iframes
         * Calls the correct calls
         * @param {string} fancyBoxCallBackAction - what fancybox function to callback
         * @param (string) action - functions calls after fancybox call
         * @param {string} heightChange - heightChange of fancybox inner
         */
        popUpCallback:function (fancyBoxCallBackAction, action) {
            this.setActionCall(action);
            this.fancyBoxCallback(fancyBoxCallBackAction);
        },

        /**
         * Depending on what callback has been set this will call fancybox callback
         * @param {string} fancyBoxCallBackAction - condition
         */
        fancyBoxCallback:function (fancyBoxCallBackAction) {

            fancyBoxCallBackAction = fancyBoxCallBackAction || false;

            switch (fancyBoxCallBackAction) {
                case "afterClose":
                    $.fancybox.close();
                    break;
                case "resize":
                    $.fancybox.resize();
                    break;
                case "update":
                    $.fancybox.update();
                    break;
            }

        },

        /**
         * State the action for the pop up to do when fancybox callback is triggered
         * @param action
         */
        setActionCall:function (action) {

            action = action === undefined ? false : action;
            switch (action) {
                case "reload_page":
                    popUpStateCondition = action;
                    this.getActionCall();
                    break;
                case "changeHeightViewPort":
                    popUpStateCondition = action;
                    break;
            }

        },

        /**
         * getAction calls is called from the fancybox callback and sets the function required
         * clear popUpStateCondition condition if call is made
         */
        getActionCall:function () {

            switch (popUpStateCondition) {
                case "reload_page":
                    //remove hash login as this crashes sm editor in ie
                    window.document.location.href = loginHost+urlLocation.pathname;
                    break;
                case "changeHeightViewPort":
                    /*
                     //change the viewport height of the iframe
                     if (SM6.Login.getHeightPopUp() != null) {
                     $('.fancybox-inner').height(SM6.Login.getHeightPopUp());
                     }
                     */
                    break;
            }

            popUpStateCondition = false;

        }
    };
}());