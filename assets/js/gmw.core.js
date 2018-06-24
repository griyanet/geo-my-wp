/**
 * This file is a bundle contains different functions and classes
 *
 * used with GEO my WP and its extensions.
 */

/************************************************/
/************ GMW General functions *************/
/************************************************/

/**
 * GEO my WP functions.
 * 
 * @type {Object}
 */
var GMW = {

    //GMW options
    options : gmwVars.settings,

    geocode_provider : gmwVars.geocodingProvider || 'google_maps',

    // hooks holder
    hooks : { action: {}, filter: {} },

    // global holder for any map elements displayed on a page.
    map_elements : {},

    // navigator timeout  limit 
    navigator_timeout : 10000,

    autocomplete_fields : ( typeof gmwAutocompleteFields !== undefined ) ? {} : gmwAutocompleteFields,

    // Navigator error messages
    navigator_error_messages : {
        1 : 'User denied the request for Geolocation.',
        2 : 'Location information is unavailable.',
        3 : 'The request to get user location timed out.',
        4 : 'An unknown error occurred'
    },

    vars : {

        // page locatore vars
        auto_locator : {
            status   : false,
            type     : false,
            callback : false       
        },

        // form locator button object
        locator_button : {
            status  : false,
            element : false,
            id      : false,
            loader  : false,
            submit  : false
        },

        // form submission vars
        form_submission : {
            status : false,
            form   : false,
            id     : false,
            submit : false
        },
    },

    current_location_fields : [
		'lat',
		'lng',
		'address',
		'formatted_address',
		'street',
		'city',
		'region_name',
		'region_code',
		'postcode',
		'country_name',
		'country_code'
	],

    /**
     * Run on page load
     * 
     * @return {[type]} [description]
     */
    init : function() {

        GMW.add_action( 'gmw_init' );

        // hide all map loaders
        //jQuery( 'div.gmw-map-wrapper' ).find( 'i.gmw-map-loader' ).fadeOut( 1500 );  

        if ( jQuery( 'div.gmw-map-wrapper.gmw-expanded-map' ).length ) {
            jQuery( 'body, html' ).addClass( 'gmw-scroll-disabled' ); 
        }

        // run form functions only when a form is present on the page
        if ( jQuery( 'div.gmw-form-wrapper, ul.gmw-form-wrapper' ).length ) {
            GMW.form_functions();
        }

        // check if we need to autolocate the user on page load
        if ( navigator.geolocation && GMW.options.general.auto_locate == 1 && GMW.get_cookie( 'gmw_autolocate' ) != 1 ) {

            //set cookie to prevent future autolocation for one day
            GMW.set_cookie( 'gmw_autolocate', 1, 1 );

            // run auto locator
            GMW.auto_locator( 'page_locator', GMW.page_locator_success, false );
        }

        // dont not enable autocomplete if google is not defined.
        // This check should be imporved.
        if ( typeof google !== 'undefined' ) {

	        // Enable address autocomplete on address fields
	        jQuery( 'input.gmw-address-autocomplete' ).each( function() {
	            if ( jQuery( this ).is( '[id]' ) ) {
	                GMW.address_autocomplete( jQuery( this ).attr( 'id' ), jQuery( this ).data() );
	            }
	        });
	    }

        if ( typeof jQuery.ui !== 'undefined' && jQuery.ui.draggable ) {
            GMW.draggable_element();
        }

        // toggle element
        GMW.toggle_element();

        // trigger range slider
        GMW.rangeslider();

        // trigger range slider
        GMW.date_picker();
    },

    /**
     * Create hooks system for JavaScript
     *
     * This code was developed by the develpers of Gravity Forms plugin and was modified to
     * work with GEO my WP. Thank you!!!
     * 
     * @param {[type]} action   [description]
     * @param {[type]} callable [description]
     * @param {[type]} priority [description]
     * @param {[type]} tag      [description]
     */
    add_action : function( action, callable, priority, tag ) {
        GMW.add_hook( 'action', action, callable, priority, tag );
    },

    /**
     * Add filter
     * 
     * @param {[type]} action   [description]
     * @param {[type]} callable [description]
     * @param {[type]} priority [description]
     * @param {[type]} tag      [description]
     */
    add_filter : function( action, callable, priority, tag ) {
        GMW.add_hook( 'filter', action, callable, priority, tag );
    },

    /**
     * Do action
     * 
     * @param  {[type]} action [description]
     * @return {[type]}        [description]
     */
    do_action : function( action ) {
        GMW.do_hook( 'action', action, arguments );
    },

    /**
     * Apply filters
     * 
     * @param  {[type]} action [description]
     * @return {[type]}        [description]
     */
    apply_filters : function( action ) {
        return GMW.do_hook( 'filter', action, arguments );
    },

    /**
     * Remove action
     * @param  {[type]} action [description]
     * @param  {[type]} tag    [description]
     * @return {[type]}        [description]
     */
    remove_action : function( action, tag ) {
        GMW.remove_hook( 'action', action, tag );
    },

    /**
     * Remove filter
     * 
     * @param  {[type]} action   [description]
     * @param  {[type]} priority [description]
     * @param  {[type]} tag      [description]
     * @return {[type]}          [description]
     */
    remove_filter : function( action, priority, tag ) {
        GMW.remove_hook( 'filter', action, priority, tag );
    },

    /**
     * Add hook
     *
     * @param {[type]} hookType [description]
     * @param {[type]} action   [description]
     * @param {[type]} callable [description]
     * @param {[type]} priority [description]
     * @param {[type]} tag      [description]
     */
    add_hook : function( hookType, action, callable, priority, tag ) {
        
        if ( undefined == GMW.hooks[hookType][action] ) {
            GMW.hooks[hookType][action] = [];
        }

        var hooks = GMW.hooks[hookType][action];
        if ( undefined == tag ) {
            tag = action + '_' + hooks.length;
        }

        if ( priority == undefined ){
            priority = 10;
        }

        GMW.hooks[hookType][action].push( { 
            tag      : tag, 
            callable : callable, 
            priority :priority 
        } );
    },

    /**
     * Do hook
     * 
     * @param  {[type]} hookType [description]
     * @param  {[type]} action   [description]
     * @param  {[type]} args     [description]
     * @return {[type]}          [description]
     */
    do_hook : function( hookType, action, args ) {

        // splice args from object into array and remove first index which is the hook name
        args = Array.prototype.slice.call( args, 1 );

        if ( undefined != GMW.hooks[hookType][action] ) {
            
            var hooks = GMW.hooks[hookType][action], hook;
           
            //sort by priority
            hooks.sort( function( a, b ) { 
                return a.priority - b.priority;
            });
            
            for ( var i = 0; i < hooks.length; i++ ) {
                
                hook = hooks[i].callable;
                
                if ( typeof hook != 'function' ) {
                    hook = window[hook];
                }

                if ( 'action' == hookType ) {
                  
                    hook.apply( null, args );

                } else {

                    args[0] = hook.apply( null, args );
                }
            }
        }
        if ( 'filter' == hookType ) {
            return args[0];
        }
    },

    /**
     * Remove hook
     * 
     * @param  {[type]} hookType [description]
     * @param  {[type]} action   [description]
     * @param  {[type]} priority [description]
     * @param  {[type]} tag      [description]
     * @return {[type]}          [description]
     */
    remove_hook : function( hookType, action, priority, tag ) {
        
        if ( undefined != GMW.hooks[hookType][action] ) {
            
            var hooks = GMW.hooks[hookType][action];
            
            for ( var i = hooks.length - 1; i >= 0; i-- ) {
                
                if ( ( undefined == tag || tag == hooks[i].tag ) && ( undefined == priority || priority == hooks[i].priority ) ){
                    hooks.splice( i, 1 );
                }
            }
        }
    },

    /**
     * Set cookie
     * 
     * @param {[type]} name   [description]
     * @param {[type]} value  [description]
     * @param {[type]} exdays [description]
     */
    set_cookie : function( name, value, exdays ) {
        var exdate = new Date();
        exdate.setTime( exdate.getTime() + ( exdays * 24 * 60 * 60 * 1000 ) );
        var cooki = escape( encodeURIComponent( value ) ) + ( ( exdays == null ) ? "" : "; expires=" + exdate.toUTCString() );
        document.cookie = name + "=" + cooki + "; path=/";
    },

    /**
     * Get cookie
     * 
     * @param  {[type]} name [description]
     * @return {[type]}      [description]
     */
    get_cookie : function( name ) {
        var results = document.cookie.match( '(^|;) ?' + name + '=([^;]*)(;|$)' );
        return results ? decodeURIComponent( results[2]) : null;
    },

    /**
     * Delete cookie
     * 
     * @param  {[type]} name [description]
     * @return {[type]}      [description]
     */
    delete_cookie : function( name ) {
    	//jQuery.cookie( name, '', { path: '/' } );
    	document.cookie = encodeURIComponent( name ) + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    	//document.cookie = encodeURIComponent( name ) + '=; expires=Thu, 01-Jan-70 00:00:01 GMT;';
        //document.cookie = encodeURIComponent( name ) + "=deleted; expires=" + new Date(0).toUTCString();
    },

    /**
     * Get user's current position
     * 
     * @param  {function} success callback function when navigator success
     * @param  {function} failed  callback function when navigator failed
     * 
     * @return {[type]}                   [description]
     */
    navigator : function( success, failed ) {

        // if navigator exists ( in browser ) try to locate the user
        if ( navigator.geolocation ) {
            
            navigator.geolocation.getCurrentPosition( show_position, show_error, { timeout: GMW.navigator_timeout } );
        
        // otherwise, show an error message
        } else {
            return failed( 'Sorry! Geolocation is not supported by this browser.' );
        }

        // geocode the coordinates if current position found
        function show_position( position ) {
            GMW.geocoder( [ position.coords.latitude, position.coords.longitude ], success, failed );
        }

        // show error if failed navigator
        function show_error( error ) {
            return failed( GMW.navigator_error_messages[error.code] );
        }
    },

    /**
     * Geocoder function. 
     *
     * Can be used for geocoding an address or reverse geocoding coordinates.
     * 
     * @param  string | array pass string if geocoding an address or array of coordinates [ lat, lng ] if reverse geocoding.
     * @param  {function} success  callback function on success
     * @param  {function} failed   callback function on failed
     * 
     * @return {[type]}          [description]
     */
    geocoder : function( location, success, failed ) {

    	// get region from settings
        var region   = typeof GMW.options.general.country_code !== 'undefined' ? GMW.options.general.country_code : 'us',
        	language = typeof GMW.options.general.language_code !== 'undefined' ? GMW.options.general.language_code : 'en',
			geocoder = new GMW_Geocoder( GMW.geocode_provider ),
        	funcName = typeof location === 'object' ? 'reverseGeocode' : 'geocode',
	        params   = { 
	            'q' 	   : location,
	            'region'   : region,
	            'language' : language
	        };

        // run geocoder
        geocoder[funcName]( params, function( response, status ) {
            // on success
            if ( status == 'OK' ) {
                return ( typeof success !== 'undefined' ) ? success( response.result, response ) : GMW.geocoder_success( response.result, response );
            // on failed      
            } else {
                return ( typeof failed !== 'undefined' ) ? failed( status, response ) : GMW.geocoder_failed( status, response );
            }
        });
    },

    /**
     * New function replaces the "geocoder" function above.
     *
     * You can feed more data into this function.
     * 
     * @type {[type]}
     */
    geocode : function( provider, type, options, success, failed ) {

    	var geocoder = new GMW_Geocoder( provider );

    	if ( type == 'reverse' ) {
    		type = 'reverseGeocode';
    	}

    	// run geocoder
        geocoder[type]( options, function( response, status ) {

            // on success
            if ( status == 'OK' ) {
                return ( typeof success !== 'undefined' ) ? success( response ) : GMW.geocoder_success( response );
            // on failed      
            } else {
                return ( typeof failed !== 'undefined' ) ? failed( status, response ) : GMW.geocoder_failed( status, response );
            }
        });
    },

    /**
     * Geocoder success default callback functions
     * 
     * @return {[type]} [description]
     */
    geocoder_success : function() {},

    /**
     * Geocoder failed default callback functions
     * 
     * @return {[type]} [description]
     */
    geocoder_failed : function( status ) {
        alert( 'We could not find the address you entered for the following reason: ' + status );
    },

    /**
     * Google places address autocomplete
     * 
     * @return void
     */
    address_autocomplete : function( field_id , fieldData ) {
          
        var input_field = document.getElementById( field_id );

        // verify the field
        if ( input_field != null ) {
            
            var options = {};

            if ( typeof fieldData.autocomplete_countries !== 'undefined' ) {
                options.componentRestrictions = { 
                    country : fieldData.autocomplete_countries.split( ',' )
                };
            }

            if ( typeof fieldData.autocomplete_types !== 'undefined' ) {
                options.types = [fieldData.autocomplete_types];
            }

            //The plugins uses basic options of Google places API. 
            //You can use this filter to modify the autocomplete options
            //see this page https://developers.google.com/maps/documentation/javascript/places-autocomplete
            //for all the available options.
            options = GMW.apply_filters( 'gmw_address_autocomplete_options', options, field_id, input_field, GMW );
    
            var autocomplete = new google.maps.places.Autocomplete( input_field, options );
             
            google.maps.event.addListener( autocomplete, 'place_changed', function() {

                var place = autocomplete.getPlace();
                
                GMW.do_action( 'gmw_address_autocomplete_place_changed', place, autocomplete, field_id, input_field, options );
                
                if ( place.geometry ) {

                    var formElement = jQuery( input_field.closest( 'form' ) );

                    // if only country entered set its value in hidden fields
                    if ( place.address_components.length == 1 && place.address_components[0].types[0] == 'country' ) {      

                        formElement.find( '.gmw-country' ).val( place.address_components[0].short_name ).prop( 'disabled', false );
                    
                    // otherwise if only state entered.
                    } else if ( place.address_components.length == 2 && place.address_components[0].types[0] == 'administrative_area_level_1' ) {
                        
                        formElement.find( '.gmw-state' ).val( place.address_components[0].long_name ).prop( 'disabled', false );
                        formElement.find( '.gmw-country' ).val( place.address_components[1].short_name ).prop( 'disabled', false );
                    }

                    // make sure coords fields exist.
                    formElement.find( '.gmw-lat' ).val( place.geometry.location.lat().toFixed(6) );
                    formElement.find( '.gmw-lng' ).val( place.geometry.location.lng().toFixed(6) );             
                }   
            });
        }
    },

    /**
     * Save location fields into cookies and current location hidden form
     * 
     * @param  {object} results location data returned forom geocoder
     * 
     * @return {[type]}         [description]
     */
    save_location_fields : function( result ) {
        
        var cl_form = jQuery( 'form#gmw-current-location-hidden-form' );
        
        GMW.do_action( 'gmw_save_location_fields', result );

        // save location in current location form and cookies.
        for ( fieldName in result ) {
        	
        	// we only want some fields to save in cookies.
        	if ( jQuery.inArray( fieldName, GMW.current_location_fields ) !== -1 ) {
        		GMW.set_cookie( 'gmw_ul_'. fieldName, result[fieldName], 7 );
        	}
        
        	cl_form.find( 'input#gmw_cl_' + fieldName ).val( result[fieldName] );

        	// hook custom functions
            GMW.do_action( 'gmw_save_location_field', result[fieldName], result );
        }

        return result;
    },

    /**
     * Page load locator function.
     *
     * Get the user's current location on page load
     * 
     * @return {[type]} [description]
     */
    auto_locator : function( type, success, failed ) {

        // set status to true
        GMW.vars.auto_locator.status  = true;
        GMW.vars.auto_locator.type    = type;
        GMW.vars.auto_locator.success = success;
        GMW.vars.auto_locator.failed  = failed;
        
        // run navigator
        GMW.navigator( GMW.auto_locator_success, GMW.auto_locator_failed );
    },

    /**
     * page load locator success callback function
     * 
     * @param  {object} results location fields returned from geocoder
     * 
     * @return {[type]}         [description]
     */
    auto_locator_success : function( results ) {

        // save address field to cookies and current location form
        address_fields = GMW.save_location_fields( results );

        // run custom callback function if set 
        if ( GMW.vars.auto_locator.success != false ) {

            GMW.vars.auto_locator.success( address_fields, results );

        // otherwise, get done with the function.
        } else {

            GMW.vars.auto_locator.status  = false;
            GMW.vars.auto_locator.type    = false;
            GMW.vars.auto_locator.success = false;
            GMW.vars.auto_locator.failed  = false;
        }
    },

    /**
     * page locator failed callback fucntion
     * 
     * @param  {string} status error message
     * 
     * @return {[type]}        [description]
     */
    auto_locator_failed : function( status ) {

        // run custom failed callback function if set
        if ( GMW.vars.auto_locator.failed != false ) {

            GMW.vars.auto_locator.failed( status );
        
        // otherwise, get done with the function.
        } else {

            // alert error message
            alert( status );

            GMW.vars.auto_locator.status  = false;
            GMW.vars.auto_locator.type    = false;
            GMW.vars.auto_locator.success = false;
            GMW.vars.auto_locator.failed  = false;
        }
    },

    /**
     * Page locator success callback function
     * 
     * @param  {[type]} results [description]
     * @return {[type]}         [description]
     */
    page_locator_success : function( address_fields, results ) {

        GMW.vars.auto_locator.status   = false;
        GMW.vars.auto_locator.callback = false;
        GMW.vars.auto_locator.type     = false;

        // submit current location hidden form
        setTimeout(function() {
            jQuery( 'form#gmw-current-location-form' ).submit();             
        }, 500); 
    },

    /**
     * GEO my WP Form functions.
     *
     * triggers only when at least one form presents on the page
     * 
     * @return {[type]} [description]
     */
    form_functions : function() {

        GMW.enable_smartbox();
     
        // remove hidden coordinates when address field value changes
        jQuery( 'form' ).find( 'input.gmw-address' ).keyup( function ( event ) { 
            
            // abort if enter key.
            if ( event.which == 13 ) {
                return;
            }

            var form = jQuery( this ).closest( 'form' );

            // clear coords, state and country fields.
            form.find( 'input.gmw-lat, input.gmw-lng' ).val( '' );
            form.find( 'input.gmw-state, input.gmw-country' ).val( '' ).prop( 'disabled', true );
        });

        // When click on locator button in a form
        jQuery( 'form' ).find( '.gmw-locator-button' ).click( function() {
            GMW.locator_button( jQuery( this ), jQuery( this ).closest( 'form' ) );
        });

        // on form submission
        jQuery( 'form.gmw-form' ).submit( function( event ) {

            // run form submission
            GMW.form_submission( jQuery( this ), event );
        });
    },

    /**
     * Enable smartbox libraries
     * @return {[type]} [description]
     */
    enable_smartbox : function() {

        // enable chosen for GEO my WP form elements
        if ( jQuery().chosen ) {
            jQuery( 'form' ).find( 'select.gmw-smartbox' ).chosen( {
                width : '100%'
            });

        // enable select 2
        } else if ( jQuery().select2 ) {
            jQuery( 'form' ).find( 'select.gmw-smartbox' ).select2();
        }
    },

    /**
     * Form submission function.
     *
     * Executes on form submission
     *     
     * @param  {object} form  The submitted form
     * @param  {object} event submit event
     * 
     * @return {[type]}       [description]
     */
    form_submission : function( form, event ) {
        
        // set form variables
        GMW.vars.form_submission.status = true;
        GMW.vars.form_submission.form   = form;
        GMW.vars.form_submission.id     = GMW.vars.form_submission.form.find( '.gmw-form-id' ).val();

        if ( GMW.vars.form_submission.submit == true ) {
            return true;
        } 

        //var form         = form;
        var addressField = form.find( 'input.gmw-address' );
        var address      = '';

        // prevent form submission. We need to run some functions.
        event.preventDefault();
        
        // set the "paged" value to first page.
        form.find( 'input.gmw-paged' ).val( '1' );
   		
   		// modify the address before geocoding takes place.
   		addressField = GMW.apply_filters( 'gmw_search_form_address_pre_geocoding', addressField, GMW );

        // get the address field/s value.
        address = addressField.map( function() {
           return jQuery( this ).val();
        }).get().join( ' ' );           
  
        // if address field is empty.
        if ( ! jQuery.trim( address ).length ) {

            // check if address is mendatory, and if so, show error and abort submission.
            if ( addressField.hasClass( 'mandatory' ) ) {

                // add error class to address fields if no address enterd.
                if ( ! addressField.hasClass( 'gmw-no-address-error' ) ) {

                    // remove the class on focus or keypress in the field
                    addressField.addClass( 'gmw-no-address-error' ).on( 'focus keypress', function() {
                        jQuery( this ).removeClass( 'gmw-no-address-error' ).off( 'focus keypress' );
                    });

                    // remove error class after a few seconds if was not removed already.
                    setTimeout( function() {
                        addressField.removeClass( 'gmw-no-address-error' ).off( 'focus keypress' );
                    }, 4000 );
                }

                // abort submission
                return false;

            // otherwise submit the form
            } else {
                
                GMW.vars.form_submission.submit = true;
                GMW.vars.form_submission.form.submit(); 

                return false;
            }
        }

        // When Client-side geocoder is enabled
        //if ( typeof clientSideGeocoder == 'undefined' || clientSideGeocoder == 1 ) {
        	
            // check if hidden coords exists. if so no need to geocode the address again and we can submit the form with the information we already have.
            if ( form.find( 'input.gmw-lat' ).val() != '' && form.find( 'input.gmw-lng' ).val() != '' ) {            
               
                GMW.vars.form_submission.submit = true;
                GMW.vars.form_submission.form.submit(); 

                return false;
            }
       
            // geocoder the address entered
            GMW.geocoder( address, GMW.form_geocoder_success, GMW.geocoder_failed );

        // Otherwise, no geocoding needed. Submit the form!
        /*} else {    

            GMW.vars.form_submission.submit = true;
            GMW.vars.form_submission.form.submit(); 

            return false;    
        }*/
    },

    /**
     * Form submission geocoder function.
     *
     * This functions excecutes once after the geocoder successful.
     * 
     * @param  object results the geocoder results
     * 
     * @return {[type]}         [description]
     */
    form_geocoder_success : function( result ) {

        var form = GMW.vars.form_submission.form;
        //var ac   = results[0].address_components;

        // if only country entered set its value in hidden fields
        if ( result.level == 'country' ) {
            
            form.find( '.gmw-country' ).val( result.country_code ).prop( 'disabled', false );

        // otherwise, if only state entered.
        } else if ( result.level == 'region' ) {
            form.find( '.gmw-state' ).val( result.region_name ).prop( 'disabled', false );
            form.find( '.gmw-country' ).val( result.country_code ).prop( 'disabled', false );
        } 

        // add coordinates to hidden fields
        form.find( '.gmw-lat' ).val( parseFloat( result.lat ).toFixed(6) );
        form.find( '.gmw-lng' ).val( parseFloat( result.lng ).toFixed(6) );

        // submit the form
        setTimeout(function() {
            GMW.vars.form_submission.submit = true;
            GMW.vars.form_submission.form.submit();  
        }, 300);

        return false; 
    },

    /**
     * Form locator button function.
     *
     * Triggered with click on a locator button
     * 
     * @param  {object} locator the button was clicked
     * 
     * @return {[type]}         [description]
     */
    locator_button : function( locator, this_form ) {

        var form;

        // if form element is missing, try to find it.
        if ( typeof this_form == 'undefined' ) {
            form = locator.closest( 'form' );
        } else {
            form = this_form;
        }
       
        // disabled all text fields and submit buttons while working
        jQuery( 'form.gmw-form' ).find( 'input[type="text"], .gmw-submit' ).attr( 'disabled', 'disabled' );
        
        // set the locator vars.
        GMW.vars.locator_button.status  = true;
        GMW.vars.locator_button.form    = form;
        GMW.vars.locator_button.element = locator;
        GMW.vars.locator_button.form_id = locator.data( 'form_id' );
        GMW.vars.locator_button.loader  = locator.next();
        GMW.vars.locator_button.submit  = locator.attr( 'data-locator_submit' ) == 1 ? true : false;

        // clear hidden coordinates
        form.find( 'input.gmw-lat, input.gmw-lng' ).val( '' );
        form.find( 'input.gmw-state, input.gmw-country' ).val( '' ).prop( 'disabled', true );
        
        // if this is a font icon inside address field
        if ( locator.hasClass( 'inside' ) ) {

            locator.addClass( 'animate-spin' );

        // otherwise, if this is a button
        } else if ( locator.hasClass( 'text' ) ) {

             GMW.vars.locator_button.loader.fadeIn( 'fast' );

        } else {

            // hide locator button
            locator.fadeOut( 'fast', function() {
                // show spinning loader 
                GMW.vars.locator_button.loader.fadeIn( 'fast' );
            });
        }

        //very short delay to allow the locator loader to load
        setTimeout( function() {            
            // run auto locator
            GMW.auto_locator( 'locator_button', GMW.locator_button_success, GMW.locator_button_failed );
        }, 500 );
    },

    /**
     * Form locator success callback function
     * 
     * @param  {object} address_fields address fields collector
     * @param  {object} results        original location fields object returned by geocoder
     * 
     * @return {[type]}                [description]
     */
    locator_button_success : function( result ) {

        var form         = GMW.vars.locator_button.form;
        var addressField = form.find( 'input.gmw-address' );

        // enable all forms.
        jQuery( 'form.gmw-form' ).find( 'input[type="text"], .gmw-submit' ).removeAttr( 'disabled' );

        // add coords value to hidden fields
        form.find( 'input.gmw-lat' ).val( parseFloat( result.lat ).toFixed(6) );
        form.find( 'input.gmw-lng' ).val( parseFloat( result.lng ).toFixed(6) );

        //dynamically fill-out the address fields of the form
        if ( addressField.hasClass( 'gmw-full-address' ) ) {
            
            addressField.val( result.formatted_address );
        
        } else {        

            form.find( '.gmw-address.street' ).val( result.street );
            form.find( '.gmw-address.city' ).val( result.city );
            form.find( '.gmw-address.state' ).val( result.region_name );
            form.find( '.gmw-address.zipcode' ).val( result.postcode );
            form.find( '.gmw-address.country' ).val( result.country_code );
        }
       
        // if form locator set to auto submit form. 
        if ( GMW.vars.locator_button.submit ) {
            
            setTimeout( function() {
                
                form.find( '.gmw-submit' ).click();

                // we do this in case of an ajax submission
                GMW.locator_button_done();

            }, 500);
            
        } else {
            GMW.locator_button_done();
        }
    },

    /**
     * Form Locator failed callback function
     * @param  {[type]} status [description]
     * @return {[type]}        [description]
     */
    locator_button_failed : function( status ) {

        // alert failed message
        alert( 'Geocoder failed due to: ' + status );

        GMW.locator_button_done();
    },

    /**
     * Form locator done callback function. 
     * @return {[type]} [description]
     */
    locator_button_done : function() {

        var locator = GMW.vars.locator_button.element;

        // enabled all text fields and submit buttons
        jQuery( 'form.gmw-form' ).find( 'input[type="text"], .gmw-submit' ).removeAttr( 'disabled' );

        if ( locator.hasClass( 'inside' ) ) {

            locator.removeClass( 'animate-spin' );

        } else {
            // hide spinning loader
            GMW.vars.locator_button.loader.fadeOut( 'fast',function() {
                // show locator button
                locator.fadeIn( 'fast' );
            } );
        }

        setTimeout( function() {
            // change locator status
            GMW.vars.locator_button.status  = false;
            GMW.vars.locator_button.element = false;
            GMW.vars.locator_button.form_id = false;
            GMW.vars.locator_button.loader  = false;
            GMW.vars.locator_button.submit  = false;
        }, 500 );
    },

    /**
     * Enable range slider
     * 
     * @return {[type]} [description]
     */
    rangeslider : function() {
        jQuery( 'form' ).find( 'input.gmw-range-slider' ).on( 'input change', function() {
            jQuery( this ).next( 'span' ).find( 'output' ).html( jQuery( this ).val() );
        });
    },

    /**
     * Enable Date picker
     * 
     * @return {[type]} [description]
     */
    date_picker : function() {

        var date_fields = jQuery( '.gmw-date-field' );
        var time_fields = jQuery( '.gmw-time-field' );

        if ( date_fields.length > 0 && typeof jQuery.fn.pickadate !== 'undefined') {
         
            date_fields.each( function() {
                var date_type = jQuery( this ).data( 'date_type' );
                jQuery( this ).pickadate({
                    //formatSubmit: 'yyyy/mm/dd',
                    format : date_type || 'yyyy/mm/dd',
                    //formatSubmit : 'yyyy/mm/dd',
                    //hiddenName: true
                });
            });
        }

        if ( time_fields.length > 0 && typeof jQuery.fn.pickatime !== 'undefined') {
            
            time_fields.each( function() {
                //var date_type = jQuery( this ).data( 'date_type' );
                jQuery( this ).pickatime({
                    interval: 1
                    //formatSubmit: 'yyyy/mm/dd',
                    //format : date_type || 'yyyy/mm/dd',
                    //formatSubmit : 'yyyy/mm/dd',
                    //hiddenName: true
                });
            });
        }
    },

    /**
     * Enable Dragging
     * 
     * @return {[type]} [description]
     */
    draggable_element : function() {

        /**
         * If this is a remote draggable element
         *
         * we need to pass some data from the original to the 
         * 
         * remote element. 
         * 
         * @param  {[type]}   var data [description]
         * @return {[type]}   [description]
         */
        jQuery( '.gmw-draggable.remote-toggle' ).each( function() {

            var data   = jQuery( this ).data();
            var target = jQuery( data.handle );
            
            target.addClass( 'gmw-draggable' ).attr( 'data-draggable', data.draggable ).attr( 'data-containment', data.containment );
        });

        /**
         * Enable draggable on mouseenter
         * 
         * @param  {[type]} e )             {            if ( ! jQuery( this ).hasClass( 'enabled' ) ) {                            jQuery( this ).addClass( 'enabled' );                var dragData [description]
         * @return {[type]}   [description]
         */
        jQuery( document ).on( 'mouseenter', '.gmw-draggable', function( e ) {

            if ( ! jQuery( this ).hasClass( 'enabled' ) ) {
            
                jQuery( this ).addClass( 'enabled' );

                var dragData = jQuery( this ).data();

                if ( dragData.draggable == 'global_map' ) {
                    dragData.draggable   = jQuery( this ).closest( '.gmw-form-wrapper' );
                    dragData.containment = jQuery( this ).closest( '.gmw-global-map-wrapper' );
                }
                
                jQuery( dragData.draggable ).draggable({
                    containment : dragData.containment,
                    handle      : jQuery( this )        
                });
            } 
        });
    },

    /**
     * Toggle elements
     * 
     * @return {[type]} [description]
     */
    toggle_element : function() {

        // do it on click
        jQuery( document ).on( 'click', '.gmw-element-toggle-button', function( e ) {
      
            var button  = jQuery( this );
            var data    = jQuery( this ).data();
            var target  = jQuery( data.target );
            var options = {};
            var visible = 1;

            // toggle icon class
            button.toggleClass( data.show_icon ).toggleClass( data.hide_icon );

            // if expanded, callapse windpw
            if ( button.attr( 'data-state' ) == 'expand' ) {

                options[data.animation] = data.close_length;

                button.attr( 'data-state', 'collapse' );
                target.attr( 'data-state', 'collapse' );

            // otherwise, expand
            } else {  

                options[data.animation] = data.open_length;
                
                button.attr( 'data-state', 'expand' );
                target.attr( 'data-state', 'expand' );
            }

            // if we do height or width animation we will use 
            // jquery aniation
            if ( data.animation == 'height' || data.animation == 'width'  ) {
               
               target.animate( options, data.duration ) ;
            
            // otherwise, we can use translatex, and we do it using css
            } else {

                target.addClass( 'gmw-toggle-element' ).css( data.animation, options[data.animation] );
            }
        });
    },

    /**
     * Get object value using string as key.
     * 
     * @param  {[type]} result [description]
     * @param  {[type]} field  [description]
     * @return {[type]}        [description]
     */
    get_field_by_string : function( result, field ) {

	    field = field.replace( /\[(\w+)\]/g, '.$1' );
	    field = field.replace( /^\./, '' );           
	    var a = field.split('.');
	    
	    for ( var i = 0, n = a.length; i < n; ++i ) {
	        
	        var k = a[i];
	        
	        if ( k in result ) {
	            result = result[k];
	        } else {
	            return '';
	        }
	    }

	    return result !== 'undefined' ? result : '';
	},
};

/************************************************/
/***************** GMW Geocoder *****************/
/************************************************/

/**
 * Geocoding providers.
 *
 * Hook custom geocoders into GMW_Geocoders.
 * 
 * @type {Object}
 */
var GMW_Geocoders = {

	/**
	 * Default options.
	 * 
	 * @type {Object}
	 */
	'options' : {
		//query 	   : '',
		'region'   	     : gmwVars.settings.general.country_code || 'us',
		'language'	     : gmwVars.settings.general.language_code || 'en',
		'suggestResults' : false,
		'limit' 	     : 10,
	},

	/**
	 * Default location fields to output.
	 * 
	 * @type {Object}
	 */
	'locationFields' : {
		'latitude' 			: '',
		'longitude' 		: '',
		'lat' 				: '',
		'lng' 				: '',
		'street_number' 	: '',
		'street_name' 		: '',
		'street' 			: '',
		'premise' 			: '',
		'neighborhood'   	: '',
		'city'           	: '',
		'county'         	: '',
		'region_name'    	: '',
		'region_code'    	: '',
		'postcode'       	: '',
		'country_name'   	: '',
		'country_code'   	: '',
		'address'           : '',
		'formatted_address' : '',
		'place_id'          : '',
		'level'				: ''
	},

	/**
	 * Nominatim geocoder ( Open Street Maps ).
	 * 
	 * @return {[type]} [description]
	 */
	'google_maps' : {

		// default options
		'options' : {
			//'language' : 'en',
			//'region'   : 'us'
			//'bounds' : // The bounding box of the viewport within which to bias geocode results more prominently.
		},

		// default location fields to return.
		'locationFields' : {},

		// Get results
		get : function( type, options, success_callback, failure_callback ) {

			var self 	 = this,
				geocoder = new google.maps.Geocoder(),
				params   = {
					'region'   : options.region,
	        		'language' : options.language
	        	};

			if ( type == 'reverseGeocode' ) {
			
				params.latLng = new google.maps.LatLng( options.q[0], options.q[1] );

			} else {

				self.defaultFields.address = options.q;
				params.address = options.q;
			}

			// get result from Nominatim.
			geocoder.geocode( params, function( data, status ) {

				self.response.data = data;

				// abort if geocoder failed.
				if ( status !== google.maps.GeocoderStatus.OK ) {
					
					self.geocodeFailed( status, failure_callback );	

					return;
				}

				if ( type == 'reverseGeocode' ) {

					// We don't want "PROXIMATE" results. 
					// It's either what the user enters or nothing at all.
					if ( data[0].geometry.location_type == 'APPROXIMATE' ) {

						self.response.data = data[0] = [];

						console.log( 'No results - Approximate.');

						return self.geocodeFailed( 'ZERO_RESULTS', failure_callback );	
					}

					return self.geocodeSuccess( data[0], success_callback );
		
				} else { 
				
					return self.geocodeSuccess( data[0], success_callback );
				}
			});
		}, 

		/**
		 * Collect location data into an object.
		 *
		 * @param  {[type]} result [description]
		 * @return {[type]}        [description]
		 */
		getLocationFields : function( result ) {
						
			var fields = {};
			var ac     = result.address_components;
			var pid    = typeof result.place_id !== undefined ? result.place_id : '';
	    	
	    	fields.formatted_address = result.formatted_address;
	    	fields.lat = fields.latitude  = result.geometry.location.lat();
	    	fields.lng = fields.longitude = result.geometry.location.lng();

	    	// ac ( address_component ): complete location data object
	    	// ac[x]: each location field in the address component
			for ( var x in ac ) {

				if ( ac[x].types == 'street_number' && ac[x].long_name != undefined ) {
					fields.street_number = ac[x].long_name;
				}
				
				if ( ac[x].types == 'route' && ac[x].long_name != undefined ) {	
					fields.street_name = ac[x].long_name;
					fields.street 	   = fields.street_number + ' ' + fields.street_name; 
				}

				if ( ac[x].types == 'subpremise' && ac[x].long_name != undefined ) {
					fields.premise = ac[x].long_name;
				}
				
				 if ( ac[x].types == 'neighborhood,political' && ac[x].long_name != undefined ) {
				 	fields.neighborhood = ac[x].long_name;
				}
	 
		        if( ac[x].types == 'locality,political' && ac[x].long_name != undefined ) {
		        	fields.city = ac[x].long_name;
				}
		        
		        if ( ac[x].types == 'administrative_area_level_1,political' ) {
		        	fields.region_name = ac[x].long_name;
		          	fields.region_code = ac[x].short_name;
		        }  
		       
	  			if ( ac[x].types == 'administrative_area_level_2,political' && ac[x].long_name != undefined ) {
	  				fields.county = ac[x].long_name;
				}

		        if ( ac[x].types == 'postal_code' && ac[x].long_name != undefined ) {
		        	fields.postcode = ac[x].long_name;
				}
		        
		        if ( ac[x].types == 'country,political' ) {
		        	fields.country_name = ac[x].long_name;		        
		          	fields.country_code = ac[x].short_name;
		        } 
	        }

			return fields;
		}
	},

	/**
	 * Nominatim geocoder ( Open Street Maps ).
	 * 
	 * @return {[type]} [description]
	 */
	'nominatim' : {

		// Rest URL
		'geocodeUrl' : 'https://nominatim.openstreetmap.org/search',

		'reverseGeocodeUrl' : 'https://nominatim.openstreetmap.org/reverse',

		// default options
		'options' : {
			'format' 		       : 'jsonv2', // [html|xml|json|jsonv2] Output format.
			'addressdetails'       : '1', 	// Include a breakdown of the address into elements
			'accept-language'      : 'en', // Preferred language order for showing search results.
			'zoom'			       : '18',
			'email'			  	   : gmwVars.settings.api.nominatim_email || '',
			'region'		  	   : 'us',
			'limit'			   	   : 10    // Limit the number of returned results. Default is 10.
			//'email'			   : <valid email address> // If you are making large numbers of request please include a valid email address
			//'countrycodes' 	   : GMW_Geocoder.region,
			//'suggestResults' : true,
			//'json_callback'	   : <string> // Wrap json output in a callback function (JSONP).
			//'q'				   : <query> // query string to search for.
			//'viewbox'			   : <x1>,<y1>,<x2>,<y2> // The preferred area to find search results.
			//'bounded'			   : [0|1] // Restrict the results to only items contained with the viewbox.
			//'exclude_place_ids'  : <place_id,[place_id],[place_id]> // If you do not want certain openstreetmap objects to appear in the search result.
			
			//'dedupe'			   : [0|1]
			//'polygon_geojson'    : 1 // Output geometry of results in geojson format.
			//'polygon_kml'		   : 1 // Output geometry of results in kml format.
			//'polygon_svg'		   : 1 // Output geometry of results in svg format.
			//'polygon_text'	   : 1 // Output geometry of results as a WKT.
			//'extratags'		   : 1 // Include additional information in the result if available, e.g. wikipedia link, opening hours.
			//'namedetails'		   : 1 // Include a list of alternative names in the results.
		},

		// default location fields to return.
		'locationFields' : {
			'place_id'          : 'place_id',
			'formatted_address' : 'display_name',
			'lat' 				: 'lat',
			'lng' 				: 'lon',
			'street_number' 	: 'address.house_number',
			'street_name' 		: 'address.road',
			'city'           	: [ 'address.city', 'address.town', 'address.suburb' ],
			'county'         	: 'address.county',
			'region_name'    	: 'address.state',
			'postcode'       	: 'address.postcode',
			'country_name'   	: 'address.country',
			'country_code'   	: 'address.country_code',
		},

		// Initialize.
		initialize : function() {
			this.options['accept-language'] = this.options.language;
		},

		// Get results
		get : function( type, options, success_callback, failure_callback ) {

			var self = this,
				search = options.q,
				params,
				query;

			// remove q from options
			delete options.q;

			params = jQuery.param( options );
				
			if ( type == 'reverseGeocode' ) {
				
				query = this.reverseGeocodeUrl + '?lat=' + search[0] + '&lon=' + search[1] + '&' + params;
			
			} else {

				self.defaultFields.address = search;
				query = this.geocodeUrl + '?q=' + search + '&' + params;
			}
				
			// get result from Nominatim.
			self.jqXHR = jQuery.getJSON( query, function( data, e ) {

				self.response.data = data;

				if ( typeof( data.error ) !== 'undefined' ) {
				
					return self.geocodeFailed( data.error, failure_callback );	
				
				} else if ( type == 'reverseGeocode' ) {

					return self.geocodeSuccess( data, success_callback );

				// if no results.
				} else if ( data.length == 0 ) {

					return self.geocodeFailed( 'No results found.', failure_callback );
		
				// Create suggested results dropdown when there are multiple results and feature is enabled.
				} else if ( options.suggestResults && data.length > 1 ) {

					return self.suggestResults( data, 'display_name', success_callback );

				} else {

					// if there are multiple locations we try to get the default location based on the region.
					if ( data.length > 1 ) {
						
						for ( var t in data ) {
							
							if ( typeof( data[t].address.country_code ) !== 'undefined' && data[t].address.country_code == options.region ) {
								
								// if location found use it and break the loop.
								self.geocodeSuccess( data[t], success_callback );

								return;
							}
						}
					}
					
					return self.geocodeSuccess( data[0], success_callback );
				}

			}).fail( function( jqXHR, textStatus, errorThrown ) { 
				self.geocodeFailed( textStatus + ' ' + errorThrown, failure_callback );
			});
		}
	},

	'regions' : {
	    "AL": "Alabama",
	    "AK": "Alaska",
	    "AS": "American Samoa",
	    "AZ": "Arizona",
	    "AR": "Arkansas",
	    "CA": "California",
	    "CO": "Colorado",
	    "CT": "Connecticut",
	    "DE": "Delaware",
	    "DC": "District Of Columbia",
	    "FM": "Federated States Of Micronesia",
	    "FL": "Florida",
	    "GA": "Georgia",
	    "GU": "Guam",
	    "HI": "Hawaii",
	    "ID": "Idaho",
	    "IL": "Illinois",
	    "IN": "Indiana",
	    "IA": "Iowa",
	    "KS": "Kansas",
	    "KY": "Kentucky",
	    "LA": "Louisiana",
	    "ME": "Maine",
	    "MH": "Marshall Islands",
	    "MD": "Maryland",
	    "MA": "Massachusetts",
	    "MI": "Michigan",
	    "MN": "Minnesota",
	    "MS": "Mississippi",
	    "MO": "Missouri",
	    "MT": "Montana",
	    "NE": "Nebraska",
	    "NV": "Nevada",
	    "NH": "New Hampshire",
	    "NJ": "New Jersey",
	    "NM": "New Mexico",
	    "NY": "New York",
	    "NC": "North Carolina",
	    "ND": "North Dakota",
	    "MP": "Northern Mariana Islands",
	    "OH": "Ohio",
	    "OK": "Oklahoma",
	    "OR": "Oregon",
	    "PW": "Palau",
	    "PA": "Pennsylvania",
	    "PR": "Puerto Rico",
	    "RI": "Rhode Island",
	    "SC": "South Carolina",
	    "SD": "South Dakota",
	    "TN": "Tennessee",
	    "TX": "Texas",
	    "UT": "Utah",
	    "VT": "Vermont",
	    "VI": "Virgin Islands",
	    "VA": "Virginia",
	    "WA": "Washington",
	    "WV": "West Virginia",
	    "WI": "Wisconsin",
	    "WY": "Wyoming"
	 },
	'countries' : {
		"AF": "Afghanistan",
		"AX": "Åland Islands",
		"AL": "Albania",
		"DZ": "Algeria",
		"AS": "American Samoa",
		"AD": "AndorrA",
		"AO": "Angola",
		"AI": "Anguilla",
		"AQ": "Antarctica",
		"AG": "Antigua and Barbuda",
		"AR": "Argentina",
		"AM": "Armenia",
		"AW": "Aruba",
		"AU": "Australia",
		"AT": "Austria",
		"AZ": "Azerbaijan",
		"BS": "Bahamas",
		"BH": "Bahrain",
		"BD": "Bangladesh",
		"BB": "Barbados",
		"BY": "Belarus",
		"BE": "Belgium",
		"BZ": "Belize",
		"BJ": "Benin",
		"BM": "Bermuda",
		"BT": "Bhutan",
		"BO": "Bolivia",
		"BA": "Bosnia and Herzegovina",
		"BW": "Botswana",
		"BV": "Bouvet Island",
		"BR": "Brazil",
		"IO": "British Indian Ocean Territory",
		"BN": "Brunei Darussalam",
		"BG": "Bulgaria",
		"BF": "Burkina Faso",
		"BI": "Burundi",
		"KH": "Cambodia",
		"CM": "Cameroon",
		"CA": "Canada",
		"CV": "Cape Verde",
		"KY": "Cayman Islands",
		"CF": "Central African Republic",
		"TD": "Chad",
		"CL": "Chile",
		"CN": "China",
		"CX": "Christmas Island",
		"CC": "Cocos (Keeling) Islands",
		"CO": "Colombia",
		"KM": "Comoros",
		"CG": "Congo",
		"CD": "Congo, Democratic Republic",
		"CK": "Cook Islands",
		"CR": "Costa Rica",
		"CI": "Cote D\"Ivoire",
		"HR": "Croatia",
		"CU": "Cuba",
		"CY": "Cyprus",
		"CZ": "Czech Republic",
		"DK": "Denmark",
		"DJ": "Djibouti",
		"DM": "Dominica",
		"DO": "Dominican Republic",
		"EC": "Ecuador",
		"EG": "Egypt",
		"SV": "El Salvador",
		"GQ": "Equatorial Guinea",
		"ER": "Eritrea",
		"EE": "Estonia",
		"ET": "Ethiopia",
		"FK": "Falkland Islands (Malvinas)",
		"FO": "Faroe Islands",
		"FJ": "Fiji",
		"FI": "Finland",
		"FR": "France",
		"GF": "French Guiana",
		"PF": "French Polynesia",
		"TF": "French Southern Territories",
		"GA": "Gabon",
		"GM": "Gambia",
		"GE": "Georgia",
		"DE": "Germany",
		"GH": "Ghana",
		"GI": "Gibraltar",
		"GR": "Greece",
		"GL": "Greenland",
		"GD": "Grenada",
		"GP": "Guadeloupe",
		"GU": "Guam",
		"GT": "Guatemala",
		"GG": "Guernsey",
		"GN": "Guinea",
		"GW": "Guinea-Bissau",
		"GY": "Guyana",
		"HT": "Haiti",
		"HM": "Heard Island and Mcdonald Islands",
		"VA": "Holy See (Vatican City State)",
		"HN": "Honduras",
		"HK": "Hong Kong",
		"HU": "Hungary",
		"IS": "Iceland",
		"IN": "India",
		"ID": "Indonesia",
		"IR": "Iran",
		"IQ": "Iraq",
		"IE": "Ireland",
		"IM": "Isle of Man",
		"IL": "Israel",
		"IT": "Italy",
		"JM": "Jamaica",
		"JP": "Japan",
		"JE": "Jersey",
		"JO": "Jordan",
		"KZ": "Kazakhstan",
		"KE": "Kenya",
		"KI": "Kiribati",
		"KP": "Korea (North)",
		"KR": "Korea (South)",
		"XK": "Kosovo",
		"KW": "Kuwait",
		"KG": "Kyrgyzstan",
		"LA": "Laos",
		"LV": "Latvia",
		"LB": "Lebanon",
		"LS": "Lesotho",
		"LR": "Liberia",
		"LY": "Libyan Arab Jamahiriya",
		"LI": "Liechtenstein",
		"LT": "Lithuania",
		"LU": "Luxembourg",
		"MO": "Macao",
		"MK": "Macedonia",
		"MG": "Madagascar",
		"MW": "Malawi",
		"MY": "Malaysia",
		"MV": "Maldives",
		"ML": "Mali",
		"MT": "Malta",
		"MH": "Marshall Islands",
		"MQ": "Martinique",
		"MR": "Mauritania",
		"MU": "Mauritius",
		"YT": "Mayotte",
		"MX": "Mexico",
		"FM": "Micronesia",
		"MD": "Moldova",
		"MC": "Monaco",
		"MN": "Mongolia",
		"MS": "Montserrat",
		"MA": "Morocco",
		"MZ": "Mozambique",
		"MM": "Myanmar",
		"NA": "Namibia",
		"NR": "Nauru",
		"NP": "Nepal",
		"NL": "Netherlands",
		"AN": "Netherlands Antilles",
		"NC": "New Caledonia",
		"NZ": "New Zealand",
		"NI": "Nicaragua",
		"NE": "Niger",
		"NG": "Nigeria",
		"NU": "Niue",
		"NF": "Norfolk Island",
		"MP": "Northern Mariana Islands",
		"NO": "Norway",
		"OM": "Oman",
		"PK": "Pakistan",
		"PW": "Palau",
		"PS": "Palestinian Territory, Occupied",
		"PA": "Panama",
		"PG": "Papua New Guinea",
		"PY": "Paraguay",
		"PE": "Peru",
		"PH": "Philippines",
		"PN": "Pitcairn",
		"PL": "Poland",
		"PT": "Portugal",
		"PR": "Puerto Rico",
		"QA": "Qatar",
		"RE": "Reunion",
		"RO": "Romania",
		"RU": "Russian Federation",
		"RW": "Rwanda",
		"SH": "Saint Helena",
		"KN": "Saint Kitts and Nevis",
		"LC": "Saint Lucia",
		"PM": "Saint Pierre and Miquelon",
		"VC": "Saint Vincent and the Grenadines",
		"WS": "Samoa",
		"SM": "San Marino",
		"ST": "Sao Tome and Principe",
		"SA": "Saudi Arabia",
		"SN": "Senegal",
		"RS": "Serbia",
		"ME": "Montenegro",
		"SC": "Seychelles",
		"SL": "Sierra Leone",
		"SG": "Singapore",
		"SK": "Slovakia",
		"SI": "Slovenia",
		"SB": "Solomon Islands",
		"SO": "Somalia",
		"ZA": "South Africa",
		"GS": "South Georgia and the South Sandwich Islands",
		"ES": "Spain",
		"LK": "Sri Lanka",
		"SD": "Sudan",
		"SR": "Suriname",
		"SJ": "Svalbard and Jan Mayen",
		"SZ": "Swaziland",
		"SE": "Sweden",
		"CH": "Switzerland",
		"SY": "Syrian Arab Republic",
		"TW": "Taiwan, Province of China",
		"TJ": "Tajikistan",
		"TZ": "Tanzania",
		"TH": "Thailand",
		"TL": "Timor-Leste",
		"TG": "Togo",
		"TK": "Tokelau",
		"TO": "Tonga",
		"TT": "Trinidad and Tobago",
		"TN": "Tunisia",
		"TR": "Turkey",
		"TM": "Turkmenistan",
		"TC": "Turks and Caicos Islands",
		"TV": "Tuvalu",
		"UG": "Uganda",
		"UA": "Ukraine",
		"AE": "United Arab Emirates",
		"GB": "United Kingdom",
		"US": "United States",
		"UM": "United States Minor Outlying Islands",
		"UY": "Uruguay",
		"UZ": "Uzbekistan",
		"VU": "Vanuatu",
		"VE": "Venezuela",
		"VN": "Viet Nam",
		"VG": "Virgin Islands, British",
		"VI": "Virgin Islands, U.S.",
		"WF": "Wallis and Futuna",
		"EH": "Western Sahara",
		"YE": "Yemen",
		"ZM": "Zambia",
		"ZW": "Zimbabwe"
	}
};

/**
 * Base Geocoder class.
 * 
 * @param {[type]} provider [description]
 */
function GMW_Geocoder( provider, inputField ) {

	// Provider Name.
	this.provider = provider || 'nominatim';

	this.inputField = inputField || false;

	// Extend this class with the geocoder functions.
	jQuery.extend( this, GMW_Geocoders[ this.provider ] );

	// set default options.
	this.options = jQuery.extend( GMW_Geocoders.options, this.options );
	
	this.response.provider = this.provider;

	// Can be used in child class to execute some function on init.
	this.initialize();	
}

// Ghost geocoder function.
function gmw_geocoder( provider ) {
	return new GMW_Geocoder( provider );
}

/**
 * Default options.
 * 
 * @type {Object}
 */
GMW_Geocoder.prototype.options = {};

/**
 * Default output location fields.
 * 
 * @type {Object}
 */
GMW_Geocoder.prototype.defaultFields = GMW_Geocoders.locationFields;

/**
 * Response from geocoder provider.
 * 
 * @type {Object}
 */
GMW_Geocoder.prototype.jqXHR = {};

/**
 * This geocoder repose.
 * 
 * @type {Object}
 */
GMW_Geocoder.prototype.response = {
	provider : '',
	type     : '',
	status   : '',
	data     : {},
	result   : {}
};

/**
 * Initial function. 
 * 
 * Can be used with child class to execute function when class initiate.
 * 
 * @return {[type]} [description]
 */
GMW_Geocoder.prototype.initialize = function() {};

/**
 * Set default options.
 * 
 * @param {[type]} options [description]
 */
GMW_Geocoder.prototype.setOptions = function( options ) {
	jQuery.extend( this.options, options );
};

/**
 * Geocode.
 * 
 * @param  {[type]} options          [description]
 * @param  {[type]} success_callback [description]
 * @param  {[type]} failure_callback [description]
 * @return {[type]}                  [description]
 */
GMW_Geocoder.prototype.geocode = function( options, success_callback, failure_callback ) {
	
	this.response.type = 'geocode';

	this.setOptions( options );
	
	// if failure callback function was not provided we will use the success callback instead.
	if ( typeof( failure_callback ) === 'undefined' ) {
		failure_callback = success_callback;
	}

	this.get( 'geocode', this.options, success_callback, failure_callback );
};

/**
 * Reverse Geocode.
 * 
 * @param  {[type]} options          [description]
 * @param  {[type]} success_callback [description]
 * @param  {[type]} failure_callback [description]
 * @return {[type]}                  [description]
 */
GMW_Geocoder.prototype.reverseGeocode = function( options, success_callback, failure_callback ) {
	
	this.response.type = 'reverseGeocode';

	this.setOptions( options );

	// if failure callback function was not provided we will use the success callback instead.
	if ( typeof( failure_callback ) === 'undefined' ) {
		failure_callback = success_callback;
	}

	this.get( 'reverseGeocode', this.options, success_callback, failure_callback );
};

/**
 * Search. 
 *
 * Will usually be same as geocode function.
 * 
 * @param  {[type]} address          [description]
 * @param  {[type]} success_callback [description]
 * @param  {[type]} failure_callback [description]
 * @return {[type]}                  [description]
 */
GMW_Geocoder.prototype.search = function( options, success_callback, failure_callback ) {
	
	this.response.type = 'search';

	this.setOptions( options );

	// if failure callback function was not provided we will use the success callback instead.
	if ( typeof( failure_callback ) === 'undefined' ) {
		failure_callback = success_callback;
	}

	this.get( 'search', this.options, success_callback, failure_callback );
};

/*
 * Get results from geocoder.
 * 
 * Override this function with geocoder child class.
 */
GMW_Geocoder.prototype.get = function() {};

/**
 * Geocode failed function.
 *
 * When geocoder fails or returns no results.
 * 
 * @param  {string}   status           failed/error message.
 * @param  {function} success_callback [description]
 * @param  {function} failure_callback [description]
 * 
 * @return {[type]}                  [description]
 */
GMW_Geocoder.prototype.geocodeFailed = function( status, failure_callback ) {

	this.response.status = status;

	console.log( 'Request failed. ' + this.response.status ); 
	console.log( this.jqXHR );

	failure_callback( this.response, status );
};

/**
 * Display list of suggested results.
 * 
 * @param  {object}   data             results from geocoder.
 * @param  {string}   formatted        the formatted address variable name.
 * @param  {function} success_callback the callback function.
 * 
 * @return void
 */
GMW_Geocoder.prototype.suggestResults = function( results, formatted, success_callback ) {

	var self  = this,
		parts = '';

	for ( var i in results ) {
		parts += '<li data-value="'+ i +'">' + results[i][formatted] + '</li>';
	}

	jQuery( '<div class="gmw-geocoder-suggested-results-wrapper"><ul class="gmw-geocoder-suggested-results">' + parts + '</ul></div>' ).appendTo( 'body' ).find( 'li' ).on( 'click', function() {
		self.geocodeSuccess( results[ jQuery( this ).data( 'value' ) ], success_callback );
		jQuery( this ).closest( '.gmw-geocoder-suggested-results-wrapper' ).fadeOut().remove();
	});
};

/**
 * Get single location field value.
 * 
 * @param  {[type]} result    [description]
 * @param  {[type]} fieldName [description]
 * @return {[type]}           [description]
 */
GMW_Geocoder.prototype.getLocationFieldValue = function( result, fieldName ) {

	// When the field name is in sub object. 
	if ( fieldName.indexOf( '.' ) > -1 ) {

	  	return GMW.get_field_by_string( result, fieldName );
	
	} else if ( typeof( result[fieldName] ) !== 'undefined' ) {

		return result[fieldName];
	
	} else {

		return '';
	}
};

/**
 * Get all the location fields.
 * 
 * @param  {[type]} result           [description]
 * @param  {[type]} success_callback [description]
 * @param  {[type]} failure_callback [description]
 * @return {[type]}                  [description]
 */
GMW_Geocoder.prototype.getLocationFields = function( result ) {
	
	var self   	   = this,
		fields 	   = this.defaultFields,
		fieldCount = Object.keys( this.locationFields ).length,
		count 	   = 0;

	// Loop through and look for the location fields in the result object.
	jQuery.each( this.locationFields, function( fieldType, fieldName ) {
		
		// When field name is an array, we can provide a few possible 
		// options where the value could be found.
		// For example, the value of city can sometimes be as city, town, suburb and so on.
		if ( jQuery.isArray( fieldName ) ) {	
			
			// loop through all possible options
			for ( var i = 0, n = fieldName.length; i < n + 1; ++i ) {
	
				if ( i < n ) {

					// look for field value.
					fields[fieldType] = self.getLocationFieldValue( result, fieldName[i] );

					// add cont and abort the loop once the value was found.
					if ( fields[fieldType] != '' ) {
						count++;
						return;
					} 

				// Add count when done and no value found.
				} else {
					count++;
				}
			}

		// get value when a single field.
		} else {
			fields[fieldType] = self.getLocationFieldValue( result, fieldName );
			count++;
		}

		// Proceed when done looping through all fields.
		// We do this count to make sure the plugin is gone through all fields
		// before finalizing the returning the result.
		if ( count == fieldCount ) {
			
			// combine street name and number into a single street field.
			fields.street = fields.street_number + ' ' + fields.street_name;

			// Create latitude,longitude duplicate to lat, lng for Backward compatibility.
			// Also parseFloat the field.
			fields.latitude  = fields.lat = parseFloat( fields.lat );
			fields.longitude = fields.lng = parseFloat( fields.lng );
						
			return fields;
		} 
	});
};

/**
 * Get geocoding level.
 * 
 * @param  {[type]} result [description]
 * @return {[type]}        [description]
 */
GMW_Geocoder.prototype.getGeocodingLevel = function( result ) {

	if ( result.street_name.trim() ) {

		return 'street';

	} else if ( result.city.trim() ) {

		return 'city';

	} else if ( result.postcode.trim() ) {

		return 'postcode';

	} else if ( result.region_name.trim() || result.region_code.trim() ) {

		return 'region';

	} else if ( result.country_name.trim() || result.country_code.trim() ) {

		return 'country';
	
	} else {
		return '';
	}
};

/**
 * Get missing country/region name/code.
 * 
 * @param  {[type]} result [description]
 * @return {[type]}        [description]
 */
GMW_Geocoder.prototype.getMissingData = function( result ) {

	var self = this;

	// Get region name if missing after geocoding.
	if ( result.region_name.trim() == '' && result.region_code.trim() != '' && GMW_Geocoders.regions[ result.region_code ] ) {
		result.region_name = GMW_Geocoders.regions[ result.region_code ];
	}

	// Get region code if missing.
	if ( result.region_code.trim() == '' && result.region_name.trim() != '' ) {

		jQuery.each( GMW_Geocoders.regions, function( regionCode, regionName ) {
			
			if ( result.region_name == regionName ) {
				
				result.region_code = regionCode;

				return false;
			}
		} );
	}

	// Get country name if missing.
	if ( result.country_name.trim() == '' && result.country_code.trim() != '' && GMW_Geocoders.countries[ result.country_code ] ) {
		result.country_name = GMW_Geocoders.countries[ result.country_code ];
	}

	// Get country code if missing.
	if ( result.country_code.trim() == '' && result.country_name.trim() != '' ) {

		jQuery.each( GMW_Geocoders.countries, function( countryCode, countryName ) {
			
			if ( result.country_name == countryName ) {
				
				result.country_code = countryCode;
				
				return false;
			}
		} );
	}

	return result;
};

/**
 * Geocode success callback.
 * 
 * @param  {[type]} result           [description]
 * @param  {[type]} success_callback [description]
 * @return {[type]}                  [description]
 */
GMW_Geocoder.prototype.geocodeSuccess = function( result, success_callback ) {

	this.response.status = 'OK';

	// extend found fields with default fields to make sure the returned
	// object has all fields regardless if they have value or not.
	result = jQuery.extend( this.defaultFields, this.getLocationFields( result ) );

	// Change usa to US.
	if ( result.country_code.toLowerCase() == 'usa' ) {
		result.country_code = 'US';
	}

	// Keep country name same.
	if ( result.country_name.toLowerCase() == 'united states of america' ) {
		result.country_name = 'United States'; 
	}

	// Uppercase region and country codes.
	result.region_code = result.region_code.toUpperCase();
	result.country_code = result.country_code.toUpperCase();

	// get geocoding level.
	result.level = this.getGeocodingLevel( result );
	
	// Get missing region/country name/code.
	if ( result.country_code.trim() == '' || result.country_name.trim() == '' || result.region_name.trim() == '' || result.region_code.trim() == '' ) {
		result = this.getMissingData( result );
	}

	this.response.result = result;

	// Modify the result.
	this.response.result = GMW.apply_filters( 'gmw_geocoder_result_on_success', this.response.result, this.response );

	console.log( 'Geocoder results:' );
	console.log( this.response );

	success_callback( this.response, 'OK' ); 
};

/************************************************/

/************************************************/
/********** Current Location extension **********/
/************************************************/

/**
 * Current location extension.
 * 
 * @type {Object}.
 */
if ( jQuery( '.gmw-current-location-wrapper' ).length ) {

	var GMW_Current_Location = {

	    // alert messages
	    messages : {
	    	'geocoder_failed' : 'Geocoder failed due to: ',
	    	'no_address'   	  : 'Please enter an address.'
	    },

	    // the processed object ID
	    object_id : false,
	   	
	   	// ajax object
	   	ajax : {},

	    /**
	     * Initiate the current location functions
	     * 
	     * @return {[type]} [description]
	     */
	    init : function() {

	        // show / hide current location form on click
	        jQuery( '.gmw-cl-form-trigger' ).click( function( event ) {
	            
	            event.preventDefault();
	            
	            // toggle form
	            jQuery( this ).closest( '.gmw-cl-form-wrapper' ).find( 'form' ).slideToggle();
	        });

	        // clear location
	        jQuery( '.gmw-cl-clear-location-trigger' ).click( function( event ) {
	            
	            event.preventDefault();
	            
	            GMW_Current_Location.object_id = jQuery( this ).closest( '.gmw-cl-form-wrapper' ).data( 'element-id' );

	            GMW_Current_Location.delete_location();
	        });
	        
	        // when autolocating user
	        jQuery( '.gmw-cl-locator-trigger' ).click( function( event ) {
	            
	            // prevent form submission
	            event.preventDefault();

	            // get the element ID
	            GMW_Current_Location.object_id = jQuery( this ).closest( 'form' ).data( 'element-id' );
	            
	            // disbale all current location address field
	            jQuery( '.gmw-cl-address-input' ).prop( 'readonly', true );

	            // show loader icon
	            jQuery( '.gmw-cl-form-submit' ).removeClass( 'gmw-icon-search' ).addClass( 'gmw-icon-spin-light animate-spin' );

	            // get loading message
	            var loadingMessage = jQuery( '#gmw-cl-message-' + GMW_Current_Location.object_id ).data( 'loading_message' );

	            // verify if need to show loading message
	            if ( loadingMessage != 0 && loadingMessage.length !== 0 ) {

	           		// show loading message
	            	jQuery( '#gmw-cl-respond-wrapper-' + GMW_Current_Location.object_id ).slideDown( 'fast', function() {
	               		jQuery( '#gmw-cl-message-' + GMW_Current_Location.object_id ).addClass( 'locating' ).html( loadingMessage );     
	            	});
	            }

	            // run the auto-locator
	            GMW.auto_locator( 'cl_locator', GMW_Current_Location.auto_locator_success, GMW_Current_Location.geocoder_failed );
	        });

	        // when hit enter in the address field of the current location form
	        jQuery( '.gmw-cl-address-input' ).bind( 'keypress', function( event ){
	            
	            if ( event.keyCode == 13 ) {
	            
	                jQuery( this ).closest( 'form' ).find( '.gmw-cl-form-submit' ).click();
	            }
	        });

	        // on current location submit click
	        jQuery( '.gmw-cl-form-submit' ).click( function( event ) {
	            
	            event.preventDefault();

	            // get the element ID
	            GMW_Current_Location.object_id = jQuery( this ).closest( 'form' ).data( 'element-id' );

	            // make sure address field is not empty
	            if ( jQuery( '#gmw-cl-address-input-' + GMW_Current_Location.object_id ).val().length === 0 ) {
	                
	                alert( GMW_Current_Location.messages.no_address  );
	                
	                return false;
	            }
	            
	            // disbale all current location address fields
	           	jQuery( '.gmw-cl-address-input' ).prop( 'readonly', true );

	           	// show loader icon
	            jQuery( '.gmw-cl-form-submit' ).removeClass( 'gmw-icon-search' ).addClass( 'gmw-icon-spin-light animate-spin' );

	            // get loading message
	            var loadingMessage = jQuery( '#gmw-cl-message-' + GMW_Current_Location.object_id ).data( 'loading_message' );

	            // verify if need to show loading message
	            if ( loadingMessage != 0 && loadingMessage.length !== 0 ) {

	           		// show loading message
	            	jQuery( '#gmw-cl-respond-wrapper-' + GMW_Current_Location.object_id ).slideDown( 'fast', function() {
	               		jQuery( '#gmw-cl-message-' + GMW_Current_Location.object_id ).addClass( 'locating' ).html( loadingMessage );     
	            	});
	            }
	            
	            // get addres value
	            var address = jQuery( '#gmw-cl-address-input-' + GMW_Current_Location.object_id ).val();
	          	
	          	// geocode the address
	            GMW.geocoder( address, GMW_Current_Location.address_geocoder_success, GMW_Current_Location.geocoder_failed );
	        });
	    },

	    delete_location : function( element ) {

	    	// delete current location cookies
	    	jQuery.each( GMW.current_location_fields, function( index, field ) {
	    		GMW.delete_cookie( 'gmw_ul_' + field );
	    	});

	    	GMW.delete_cookie( 'gmw_autolocate' );

	    	jQuery( '.gmw-cl-address .address-holder' ).html( '' );
	    	jQuery( '.gmw-cl-element.gmw-cl-address-wrapper' ).slideUp();
	        jQuery( '.gmw-map-wrapper.current_location' ).fadeOut();
	        jQuery( '.gmw-cl-form-trigger, .gmw-cl-clear-location-trigger' ).slideUp();
	        jQuery( '.gmw-cl-form' ).slideDown();
	    },

	    /**
	     * Save current location via ajax
	     * 
	     * @return {[type]} [description]
	     */
	    save_location : function() {

	        GMW_Current_Location.ajax = jQuery.ajax({
	            type     : 'POST',
	            url      : gmwVars.ajaxUrl,
	            dataType : 'json',
	            data     : {
	                action      : 'gmw_update_current_location',
	                form_values : jQuery( '#gmw-current-location-hidden-form' ).serialize(), 
	               	security 	: gmw_cl_nonce,
	            },

	            // on save success
	            success : function( response ) {
	     	
	            	// look for map object and if exists update it based on the new current location
	               	if ( typeof GMW_Maps != 'undefined' && typeof GMW_Maps[GMW_Current_Location.object_id] != 'undefined' ) {

	               		var mapId        = GMW_Current_Location.object_id;
	               		var gmwMap       = GMW_Maps[mapId];
	                	var new_position = gmwMap.latLng( response.lat, response.lng );
	                	
	                	gmwMap.setMarkerPosition( gmwMap.user_marker, new_position, gmwMap );
						gmwMap.map.panTo( new_position );
	                }

	                newAddress = jQuery( '#gmw-cl-address-input-' + GMW_Current_Location.object_id ).val();

	                // change the address in the current location element
	                jQuery( '.gmw-cl-address .address-holder' ).html( newAddress );
	            }

	        // if failed
	        }).fail( function ( response ) {    

	            //display messages in console
	            if ( window.console && window.console.log ) {

	                if ( response.responseText ) {
	                    console.log( response.responseText );
	                }

	                console.log( response );
	            }
	        });

	        // when ajax done
	        GMW_Current_Location.ajax.done( function ( response ) {

	        	setTimeout( function() {

		            jQuery( '.gmw-cl-respond-wrapper' ).slideUp();
		            //jQuery( '#gmw-cl-message-' + GMW.current_location.id ).removeClass( 'error' ).html('');
		            jQuery( '.gmw-cl-address-input' ).prop( 'readonly', false );
		            jQuery( '.gmw-cl-form-submit' ).removeClass( 'gmw-icon-spin-light animate-spin' ).addClass( 'gmw-icon-search' );

		        }, 500 ); 
	        });   
	    },

	    submit_location : function() {

	    	// allow a few seconds for the location fields to populate in the hidden form
	        setTimeout( function() {

	        	// udpate via ajax
	        	if ( jQuery( '#gmw-cl-form-wrapper-' + GMW_Current_Location.object_id ).data( 'ajax_enabled' ) == 1 ) {

					GMW_Current_Location.save_location();  
	        	
	        	// page load update
	        	} else {

	        		jQuery( '#gmw-current-location-hidden-form' ).submit();
	        	}	             

	        }, 3500 );    
	    },

	    /**
	     * auto-locator success callbacl function 
	     * 
	     * @param  {[type]} address_fields [description]
	     * @return {[type]}                [description]
	     */
	    auto_locator_success : function( address_fields ) {

	        jQuery( '#gmw-cl-address-input-' + GMW_Current_Location.object_id ).val( address_fields.formatted_address );
	        
	        GMW_Current_Location.submit_location();
	    },

	    /**
	     * address geocoder success callback function 
	     * 
	     * @param  {[type]} results [description]
	     * @return {[type]}         [description]
	     */
	    address_geocoder_success : function( results ) {

	    	// save address field to cookies and current location hidden form
	        GMW.save_location_fields( results );

	        GMW_Current_Location.submit_location();                         
	    },

	    /**
	     * geocoder failed callback function 
	     * 
	     * @param  {[type]} results [description]
	     * @return {[type]}         [description]
	     */
	    geocoder_failed : function( status ) {

	    	jQuery( '#gmw-cl-respond-wrapper-' + GMW_Current_Location.object_id ).slideDown( function() {
	    		jQuery( '#gmw-cl-message-' + GMW_Current_Location.object_id ).addClass( 'error' ).html( GMW_Current_Location.messages.geocoder_failed + status );

	    	});
	        
	        setTimeout( function() {
	            jQuery( '.gmw-cl-respond-wrapper' ).slideUp();
	            jQuery( '.gmw-cl-message' ).removeClass( 'error' ).html( '' );
	            jQuery( '.gmw-cl-address-input' ).prop( 'readonly',false );
	            jQuery( '.gmw-cl-form-submit' ).removeClass( 'gmw-icon-spin-light animate-spin').addClass( 'gmw-icon-search' );
	        }, 3000 );                       
	    },
	};
}

/************************************************/

// initialize stuff on page loaded.
jQuery( document ).ready( function( $ ) {

    // load this part in front-end only
    if ( gmwVars.isAdmin == false ) {
        
        GMW.init(); 

        // initiate current location only when needed.
        if ( $( '.gmw-current-location-wrapper' ).length ) {
   			GMW_Current_Location.init();
   		}
    }
});
