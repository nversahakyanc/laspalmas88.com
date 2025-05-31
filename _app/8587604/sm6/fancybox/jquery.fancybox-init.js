$(document).ready(function() {

    $(".imagePopup").fancybox({
        prevEffect : 'fade',
        nextEffect : 'fade',
        nextSpeed  : 'fast',
        prevSpeed  : 'fast',
        helpers:  {
            title : {
                type : 'inside'
            },
            overlay: {
                css: {'background': 'rgba(0, 0, 0, 0.6)'},
                locked: false
            }
        },
        wrapCSS : 'sm-lightbox',
        padding: 10,
        beforeShow: function () {
            var imgAlt = $(this.element).find('img').attr('alt');
            if (imgAlt) {
                $('.fancybox-image').attr('alt', imgAlt);
            }
        }
    });

});