var app = angular.module('userRoutes', ['ngRoute'])

    .config(function ($routeProvider, $locationProvider) {
        $routeProvider

            .when('/register', {
                templateUrl : '/app/views/users/register.html',
                controller : 'regCtrl',
                controllerAs : 'register',
                authenticated : false
            })

            .when('/login', {
                templateUrl : '/app/views/users/login.html',
                controller : 'regCtrl',
                controllerAs : 'register',
                authenticated : false
            })

            .when('/logout', {
                templateUrl : '/app/views/users/logout.html',
                authenticated : false,
                controller : 'editCtrl',
                controllerAs : 'edit'
            })

            .when('/profile', {
                templateUrl : '/app/views/users/userProfile.html',
                authenticated : true,
                controller : 'profileCtrl',
                controllerAs : 'profile'
            })

            .when('/company-registration', {
                templateUrl : '/app/views/pages/company-registration.html',
                authenticated : true,
                controller : 'companyregistrationCtrl',
                controllerAs : 'companyregistration'
            })

            .when('/company-schedule', {
                templateUrl : '/app/views/pages/company-schedule.html',
                authenticated : true,
                controller : 'companyscheduleCtrl',
                controllerAs : 'companyschedule'
            })

            .when('/announcements', {
                templateUrl : '/app/views/pages/announcements.html',
                authenticated : true
            })

            .when('/result', {
                templateUrl : '/app/views/pages/result.html',
                authenticated : true
            })

            .when('/timeline', {
                templateUrl : '/app/views/student/timeline.html',
                authenticated : true
            })

            .when('/notifications', {
                templateUrl : '/app/views/student/notifications.html',
                authenticated : true
            })

            .when('/company', {
                templateUrl : '/app/views/pages/company.html',
                authenticated : true
            })



            .when('/help', {
                templateUrl : '/app/views/pages/help.html',
            })

            .when('/contact', {
                templateUrl : '/app/views/pages/contact.html',
            })

            .when('/services', {
                templateUrl : '/app/views/pages/services.html',
            })

            .when('/activate/:token', {
                templateUrl : '/app/views/users/activation/activate.html',
                authenticated : false,
                controller : 'emailCtrl',
                controllerAs : 'email'
            })

            .when('/resend', {
                templateUrl : '/app/views/users/activation/resend.html',
                authenticated : false,
                controller : 'resendCtrl',
                controllerAs : 'resend'
            })

            .when('/forgot', {
                templateUrl : '/app/views/users/forgot.html',
                authenticated : false,
                controller : 'forgotCtrl',
                controllerAs : 'forgot'
            })

            .when('/forgotPassword/:token', {
                templateUrl : 'app/views/users/resetPassword.html',
                authenticated : false,
                controller : 'resetCtrl',
                controllerAs : 'reset'
            })

            .when('/management', {
                templateUrl : 'app/views/admin/management.html',
                authenticated : true,
                controller : 'managementCtrl',
                controllerAs : 'management',
                permission : 'admin'
            })

            .when('/edit/:id', {
                templateUrl : 'app/views/admin/edit.html',
                authenticated : true,
                controller : 'editCtrl',
                controllerAs : 'edit',
                permission : 'admin'
            })


            .otherwise( { redirectTo : '/'});

        $locationProvider.html5Mode({
            enabled : true,
            requireBase : false
        })
    });

app.run(['$rootScope','auth','$location', 'user', function ($rootScope,auth,$location,user) {

    $rootScope.$on('$routeChangeStart', function (event, next, current) {

        if(next.$$route) {

            if(next.$$route.authenticated === true) {

                if(!auth.isLoggedIn()) {
                    event.preventDefault();
                    $location.path('/');
                } else if(next.$$route.permission) {

                    user.getPermission().then(function (data) {

                        if(next.$$route.permission !== data.data.permission) {
                            event.preventDefault();
                            $location.path('/');
                        }

                    });
                }

            } else if(next.$$route.authenticated === false) {

                if(auth.isLoggedIn()) {
                    event.preventDefault();
                    $location.path('/profile');
                }

            } /*else {
                console.log('auth does not matter');
            }
            */
        } /*else {
            console.log('Home route is here');
        }
*/
    })
}]);
