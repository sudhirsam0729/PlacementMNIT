/*
    API written by - Pankaj Tanwar
*/
var User = require('../models/user');
var Schedule = require('../models/schedule');
var Announcement = require('../models/announcement');
var Feedback = require('../models/feedback');
var Company = require('../models/company');
var Interview = require('../models/interview');
var auth = require('../middlewares/authPermission');
var jwt = require('jsonwebtoken');
var secret = 'placementmnit';
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.PTP_EMAIL,
        pass: process.env.PTP_EMAIL_PASSWORD
    }
});

module.exports = function (router){

    // User login API
    router.post('/authenticate', function (req,res) {

        if(!req.body.college_id || !req.body.password) {
            res.json({
                success : false,
                message : 'Ensure you filled all the entries.'
            });
        } else {

            User.findOne({ college_id : (req.body.college_id).toUpperCase() }).select('college_id student_name password active').exec(function (err, user) {

                if(err) throw err;

                if(!user) {
                    res.json({
                        success : false,
                        message : 'User not found.'
                    });
                } else if(user) {

                    if(!user.active) {
                        res.json({
                            success : false,
                            message : 'Account is not activated yet.Please check your email for activation link.',
                            expired : true
                        });
                    } else {

                        var validPassword = user.comparePassword(req.body.password);

                        if (validPassword) {
                            var token = jwt.sign({
                                college_id : user.college_id,
                                student_name: user.student_name
                            }, secret);
                            res.json({
                                success: true,
                                message: 'User authenticated.',
                                token: token
                            });
                        } else {
                            res.json({
                                success: false,
                                message: 'Incorrect password. Please try again.'
                            });
                        }
                    }
                }
            });
        }

    });

    // Send link to email id for reset password
    router.put('/forgotPasswordLink', function (req,res) {

        if(!req.body.college_id) {
            res.json({
                success : false,
                message : 'Please ensure you filled the entries.'
            });
        } else {

            User.findOne({ college_id : (req.body.college_id).toUpperCase() }).select('college_id college_email temporarytoken student_name').exec(function (err,user) {
                if(err) throw err;

                if(!user) {
                    res.json({
                        success : false,
                        message : 'College ID not found.'
                    });
                } else {

                    console.log(user.temporarytoken);

                    user.temporarytoken = jwt.sign({
                        student_name: user.student_name,
                        college_id: user.college_id
                    }, secret);

                    console.log(user.temporarytoken);

                    user.save(function (err) {
                        if(err) {
                            res.json({
                                success : false,
                                message : 'Error accured! Please try again. '
                            })
                        } else {

                            var email = {
                                from: '"Placement & Training Cell" <ptcell@mnit.ac.in>',
                                to: user.college_email,
                                subject: 'Reset Password Request : Placement Cell, MNIT Jaipur',
                                text: 'Hello '+ user.student_name + 'You requested for the reset password.Please find the below link Reset password With Regards, Prof. Mahendar Choudhary',
                                html: 'Hello <strong>'+ user.student_name + '</strong>,<br><br>You requested for the reset password. Please find the below link<br><br><a href="' +req.body.hostname + "/forgotPassword/" + user.temporarytoken + '">Reset password</a><br><br>With Regards.<br><br>Prof. Mahender Choudhary<br>In-charge, Training & Placement<br>MNIT Jaipur<br>+91-141-2529065'
                            };

                            transporter.sendMail(email, function(err, info){
                                if (err ){
                                    console.log(err);
                                    res.json({
                                        success : false,
                                        message : 'Email service not working. Contact Admin.'
                                    })
                                }
                                else {
                                    console.log('Message sent: ' + info.response);

                                    res.json({
                                        success : true,
                                        message : 'Link to reset your password has been sent to your registered email.'
                                    });
                                }
                            });
                        }
                    });

                }

            })

        }
    });

    // router to change password
    router.post('/forgotPassword/:token', function (req,res) {

        if(!req.params.token) {
            res.json({
                success : false,
                message : 'No token provied.'
            });
        } else {

            User.findOne({ temporarytoken : req.params.token }).select('college_id temporarytoken').exec(function (err,user) {

                if(err) throw err;

                if(!user) {
                    res.json({
                        success : false,
                        message : 'Link has been expired.'
                    });
                } else {
                    res.json({
                        success : true,
                        user : user
                    });
                }
            });
        }
    });

    // route to reset password
    router.put('/resetPassword/:token', function (req,res) {

        if(!req.body.password) {
            res.json({
                success : false,
                message : 'New password is missing.'
            })
        } else {

            User.findOne({ temporarytoken : req.params.token }).select('student_name password').exec(function (err,user) {

                if(err) throw err;

                if(!user) {
                    res.json({
                        success : false,
                        message : 'Link has been expired.'
                    })
                } else {

                    user.password = req.body.password;
                    user.temporarytoken = false;

                    user.save(function (err) {
                        if(err) {
                            res.json({
                                success : false,
                                message : 'Password must have one lowercase, one uppercase, one special character, one number and minimum 8 and maximum 25 character.'
                            });
                        } else {

                            res.json({
                                success : true,
                                message : 'Password has been changed successfully.'
                            })
                        }
                    })
                }
            })
        }
    });

    // Middleware to verify token
    router.use(function (req,res,next) {

        var token = req.body.token || req.body.query || req.headers['x-access-token'];

        if(token) {
            // verify token
            jwt.verify(token, secret, function (err,decoded) {
                if (err) {
                    res.json({
                        success : false,
                        message : 'Token invalid.'
                    })
                }
                else {
                    req.decoded = decoded;
                    next();
                }
            });

        } else {
            res.json({
                success : false,
                message : 'No token provided.'
            });
        }
    });

    // API User profile
    router.post('/me', function (req,res) {

        //console.log(req.decoded.email);
        // getting profile of user from database using email, saved in the token in localStorage
        User.findOne({ college_id : req.decoded.college_id }).select('college_id student_name gender department red_flags passout_batch').exec(function (err, user) {
            if(err) throw err;

            if(!user) {
                res.status(500).send('User not found.');
            } else {
                res.send(user);
            }
        });
    });

    // get permission of user
    router.get('/permission', function (req,res) {

        User.findOne({ college_id : req.decoded.college_id }).select('permission').exec(function (err,user) {

            if(err) throw err;

            if(!user) {
                res.json({
                    success : false,
                    message : 'User not found.'
                })
            } else {
                res.json({
                    success : true,
                    permission : user.permission
                })
            }
        })
    });

    // get all announcements
    router.get('/getAnnouncements', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            })
        } else {
            Announcement.find({ }, function (err, announcements) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Error while getting data.'
                    })
                }

                if(!announcements) {
                    res.json({
                        success : false,
                        message : 'Announcements not found.'
                    })
                } else {
                    res.json({
                        success : true,
                        announcements : announcements
                    })
                }
            })
        }
    });

    // get companies details from db
    router.get('/getAllUpcomingCompanies', function (req, res) {

        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            });
        } else {
            User.findOne({ college_id : req.decoded.college_id }).select('passout_batch').lean().exec(function (err, user) {
                if (err) {
                    res.json({
                        success: false,
                        message: 'Something went wrong!'
                    })
                } else {
                    if(!user) {
                        res.json({
                            success : false,
                            message : 'User not found.'
                        })
                    } else {
                        // todo Add here validation according to branch, cgpa etc
                        Company.find({ passout_batch: user.passout_batch, deadline_date : { $gte: new Date() -1 } }).select('company_name job_profile package deadline_date').lean().exec(function (err, companies) {
                            if(err) {
                                res.json({
                                    success : false,
                                    message : 'Error while getting data from database.'
                                });
                            }

                            if(!companies) {
                                res.json({
                                    success : false,
                                    message : 'Companies not found.'
                                });
                            } else {
                                res.json({
                                    success : true,
                                    companies : companies
                                })
                            }
                        })
                    }
                }
            });
        }
    });

    // get previous companies details from db
    router.get('/getAllPreviousCompanies', function (req, res) {

        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            });
        } else {
            // todo Add here validation according to branch, cgpa etc
            User.findOne({ college_id : req.decoded.college_id }).select('passout_batch').lean().exec(function (err, user) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Something went wrong!'
                    })
                } else {
                    if(!user) {
                        res.json({
                            success : false,
                            message : 'User not found.'
                        })
                    } else {
                        Company.find({ passout_batch : user.passout_batch, deadline_date : { $lt: new Date() }  }).select('company_name job_profile package deadline_date').exec(function (err, companies) {
                            if(err) {
                                res.json({
                                    success : false,
                                    message : 'Error while getting data from database.'
                                });
                            }

                            if(!companies) {
                                res.json({
                                    success : false,
                                    message : 'Companies not found.'
                                });
                            } else {
                                res.json({
                                    success : true,
                                    companies : companies
                                })
                            }
                        })
                    }
                }
            });
        }
    });

    // get company details
    router.get('/getCompanyDetails/:company_id', function (req, res) {

        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            });
        } else {
            Company.findOne({ _id : req.params.company_id}).select('-candidates').lean().exec(function (err, companyDetail) {
                if(err) {
                    console.log(err);
                    res.json({
                        success : false,
                        message : 'Error while getting data from database.'
                    });
                }

                if(!companyDetail) {
                    res.json({
                        success : false,
                        message : 'Company not found.'
                    });
                } else {
                    res.json({
                        success : true,
                        companyDetail : companyDetail
                    })
                }
            })

        }
    });

    // get candidate apply status in company
    router.get('/getCandidateApplyStatus/:company_id', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            });
        } else {
            Company.findOne({ _id : req.params.company_id}, function (err, company) {
                if(err) {
                    console.log(err);
                    res.json({
                        success : false,
                        message : 'Database error.'
                    });
                }
                // No candidate registered till now
                if(!company) {
                    res.json({
                        success : false,
                        message : 'Not applied.'
                    });
                } else {
                    console.log(company.candidates);

                    if(company.candidates.find(candidate => candidate.college_id === req.decoded.college_id)) {
                        res.json({
                            success : true,
                            message : 'Applied',
                            status : company.candidates[company.candidates.indexOf(company.candidates.find(x => x.college_id === req.decoded.college_id))].candidate_status
                        });
                    } else {
                        res.json({
                            success : false,
                            message : 'Not applied.'
                        })
                    }
                }
            })
        }
    });

    // register in a company by student
    router.post('/oneClickApply/:company_id', auth.ensureStudent, function (req, res) {
        Company.findOne({ _id : req.params.company_id }, function (err, company) {
            if(err) {
                console.log(err);
                res.json({
                    success : false,
                    message : 'Some Database error.'
                });
            }

            if(!company) {
                // Company not found
                res.json({
                    success : false,
                    message : 'Company not found.'
                })
            } else {
                // todo Check deadline date
                // todo check eligibility criteria
                // todo check if already applied
                company.candidates.push({ college_id : req.decoded.college_id, timestamp : new Date()});

                company.save(function (err) {
                    if(err) {
                        console.log(err);
                        res.json({
                            success : false,
                            message : 'Database error.'
                        });
                    } else {
                        res.json({
                            success : true,
                            message : 'Successfully applied.'
                        });
                    }
                })
            }
        })
    });

    // route to withdraw application
    router.post('/withdrawApplication/:company_id', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            })
        } else {
            Company.findOne({ _id : req.params.company_id }, function (err, company) {
                if(err) {
                    console.log(err);
                    res.json({
                        success : false,
                        message : 'Database error.'
                    });
                }

                if(!company) {
                    // Company not found
                    res.json({
                        success : false,
                        message : 'Company not found.'
                    })
                } else {

                    // todo check timestamp
                    let candidateIndex;

                    for(let i=0;i<company.candidates.length;i++) {
                        if(company.candidates[i].college_id === req.decoded.college_id) {
                            candidateIndex = i;
                            break;
                        }
                    }

                    company.candidates.splice(candidateIndex,1);

                    company.save(function (err) {
                        if(err) {
                            res.json({
                                success : false,
                                message : 'Database error.'
                            });
                        } else {
                            res.json({
                                success : true,
                                message : 'Registration successfully withdraw.'
                            });
                        }
                    })
                }
            })
        }
    });

    // get user timeline
    router.get('/getTimeline', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            });
        } else {
            Company.find({  }, function (err, companyData) {
                if(err) {
                    console.log(err);
                    res.json({
                        success : false,
                        message : 'Database error.'
                    })
                }

                if(!companyData) {
                    res.json({
                        success : false,
                        message : 'Company not found.'
                    });
                } else {

                    // todo code optimization with reduceMap
                    let candidateTimeline = [];

                    // Used Let for scope purpose
                    for(let i=0; i < companyData.length; i++) {
                        if(companyData[i].candidates.find(obj => obj.college_id === req.decoded.college_id)) {

                            let candidateTimelineObj = {};

                            candidateTimelineObj.company_name = companyData[i].company_name;
                            // todo company coming to MNIT date
                            candidateTimelineObj.company_date = companyData[i].deadline_date;
                            //console.log(candidatesData);
                            candidateTimelineObj.timestamp = (companyData[i].candidates.find(obj => obj.college_id === req.decoded.college_id)).timestamp;
                            candidateTimelineObj.status = (companyData[i].candidates.find(obj => obj.college_id === req.decoded.college_id)).candidate_status;

                            candidateTimeline.push(candidateTimelineObj);
                            console.log(candidateTimeline)
                        }
                    }

                    console.log(candidateTimeline);
                    res.json({
                        success : true,
                        candidateTimeline : candidateTimeline
                    })

                }
            })
        }
    });

    // get user profile details
    router.get('/getUserProfile', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login'
            })
        } else {
            User.findOne({ college_id : req.decoded.college_id}, function (err, user) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Database error'
                    })
                }

                if(!user) {
                    res.json({
                        success : false,
                        message : 'User not found.'
                    })
                } else {
                    res.json({
                        success : true,
                        profile : user
                    })
                }
            })
        }
    });

	// update user profile
	router.put('/updateProfile', function (req, res) {
		if(!req.decoded.college_id) {
		    res.json({
		        success : false,
		        message : 'Please login.'
		    })
		} else {
		    User.findOne({ college_id : req.decoded.college_id }, function (err, user) {
		        if(err) {
		            res.json({
		                success : false,
		                message : 'Error from database.'
		            })
		        }

		        if(!user) {
		            res.json({
		                success : false,
		                message : 'User not found.'
		            })
		        } else {

		            // todo optimize code
		            if(req.body.matric_marks) {
		                user.matric_marks = req.body.matric_marks;
		            }
		            if(req.body.matric_board) {
		                user.matric_board = req.body.matric_board;
		            }
		            if(req.body.senior_marks) {
		                user.senior_marks = req.body.senior_marks;
		            }
		            if(req.body.senior_board) {
		                user.senior_board = req.body.senior_board;
		            }
		            if(req.body.alternate_contact_no) {
		                user.alternate_contact_no = req.body.alternate_contact_no;
		            }
		            if(req.body.address) {
		                user.address = req.body.address;
		            }
		            if(req.body.city) {
		                user.city = req.body.city;
		            }
		            if(req.body.post_code) {
		                user.post_code = req.body.post_code;
		            }
		            if(req.body.state) {
		                user.state = req.body.state;
		            }
		            if(req.body.country) {
		                user.country = req.body.country;
		            }
		            if(req.body.linkedln_link) {
		                user.linkedln_link = req.body.linkedln_link;
		            }

		            user.save(function (err) {
		                if(err) {
		                    console.log(err);
		                    res.json({
		                        success : false,
		                        message : 'Error while saving to database.'
		                    })
		                } else {
		                    res.json({
		                        success : true,
		                        message : 'Profile Successfully updated.'
		                    })
		                }
		            })
		        }
		    })
		}
	});

	// check profile is complete or not
	router.get('/checkCompleteProfile', function (req, res) {
	   if(!req.decoded.college_id) {
		   res.json({
		       success : false,
		       message : 'Please login.'
		   })
	   } else {
		   User.findOne({ college_id : req.decoded.college_id }, function (err, user) {
		       if(err) {
		           res.json({
		               success : false,
		               message : 'Error from database.'
		           })
		       }
		      
		       if(!user) {
		           res.json({
		               success : false,
		               message : 'User not found'
		           })
		       } else {
		           if(!user.matric_marks || !user.matric_board || !user.senior_marks || !user.senior_board || !user.alternate_contact_no || !user.address || !user.city || !user.post_code || !user.state || !user.country || !user.linkedln_link ) {
		               res.json({
		                   success : false,
		                   message : 'Profile fields missing'
		               })
		           } else {
		               res.json({
		                   success : true,
		                   message : 'Profile is complete!'
		               })
		           }
		       }
		   })
	   }
	});

    // send feedback
    router.post('/sendFeedback', function (req, res) {

        // todo notification to PANKAJ TANWAR
        let feedback = new Feedback();

        feedback.title = req.body.title;
        feedback.feedback = req.body.feedback;
        //console.log(req.decoded.student_name);
        feedback.author_name = req.decoded.student_name;
        feedback.author_email = req.decoded.college_id + '@mnit.ac.in';
        feedback.timestamp = new Date();

        feedback.save(function (err) {
            if(err) {
                console.log(err);
                res.json({
                    success : false,
                    message : 'Database error'
                })
            } else {
                res.json({
                    success : true,
                    message : 'Thank you for submitting feedback.'
                })
            }
        })
    });

    // get company attendance status
    router.get('/getAttendanceStatus/:company_id', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            })
        } else {
            Company.findOne({ _id : req.params.company_id}, function (err, company) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Database error.'
                    })
                }

                if(!company) {
                    res.json({
                        success : false,
                        message : 'Company Not found.'
                    })
                } else {
                    res.json({
                        success : true,
                        attendanceStatus : company.attendance,
                        company_otp : company.company_otp
                    })
                }
            })
        }
    });

    // mark attendance
    router.post('/markCompanyAttendance/:company_id', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            })
        } else {
            Company.findOne({ _id : req.params.company_id}, function (err, company) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Error from database'
                    })
                }

                if(!company) {
                    res.json({
                        success : false,
                        message : 'Company not found.'
                    })
                } else {
                    if(company.attendance) {
                        if(company.company_otp === req.body.otp) {
                            var index = company.candidates.indexOf(company.candidates.find(x => x.college_id === req.decoded.college_id));

                            company.candidates[index].candidate_status = 'Appeared for Test';

                            company.save(function (err) {
                                if(err) {
                                    res.json({
                                        success : false,
                                        message : 'Database error'
                                    })
                                } else {
                                    res.json({
                                        success : true,
                                        message : 'Attendance successfully marked.'
                                    })
                                }
                            })
                        } else {
                            res.json({
                                success : false,
                                message : 'Incorrect OTP'
                            })
                        }
                    } else {
                        res.json({
                            success : false,
                            message : 'Attendance is closed.'
                        })
                    }
                }
            })
        }
    });

    // mark ref flag to absent students
    router.post('/sendEmailToAbsentAndMarkRedFlag/:company_id', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            })
        } else {
            Company.findOne({ _id : req.params.company_id }, function (err, company) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Error from database side.'
                    })
                }

                if(!company) {
                    res.json({
                        success : false,
                        message : 'Company not found.'
                    })
                } else {
                    for(var i=0;i< company.candidates.length;i++) {
                        if (company.candidates[i].candidate_status === 'Absent') {

                            User.findOne({ college_id :  company.candidates[i].college_id }, function (err, user) {
                                if(err) {
                                    console.log(err);
                                }

                                if(!user) {
                                    console.log('User not found')
                                } else {
                                    if(user.red_flags) {
                                        user.red_flags = user.red_flags + 1;
                                    } else {
                                        user.red_flags = 1;
                                    }

                                    user.save(function (err) {
                                        if(err) {
                                            console.log('Error from database side.' + err);
                                        } else {
                                            var email = {
                                                from: '"Placement & Training Cell" <ptcell@mnit.ac.in>',
                                                to: user.college_email,
                                                subject: 'Red Flag Notification : Placement Cell, MNIT Jaipur',
                                                text: 'Hello '+ user.student_name + 'Your profile has been red flaged. 3 Red Flags will block your profile. With Regards, Prof. Mahendar Choudhary',
                                                html: 'Hello <strong>'+ user.student_name + '</strong>,<br><br>Your profile has been red flaged. 3 Red Flags will block your profile<br><br>With Regards.<br><br>Prof. Mahender Choudhary<br>In-charge, Training & Placement<br>MNIT Jaipur<br>+91-141-2529065'
                                            };

                                            transporter.sendMail(email, function(err, info){
                                                if (err ){
                                                    console.log(err);
                                                }
                                                else {
                                                    console.log('Message sent: ' + info.response);
                                                }
                                            });
                                        }
                                    });

                                }
                            })
                        }
                    }

                    res.json({
                        success : true,
                        message : 'Email sent successfully.'
                    });
                }
            });
        }
    });

    // change password
    router.post('/changePassword', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login first.'
            })
        } else {
            User.findOne({ college_id : req.decoded.college_id }).select('password').exec(function (err, user) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Something went wrong!'
                    })
                } else {
                    if(!user) {
                        res.json({
                            success : false,
                            message : 'User not found.'
                        })
                    } else {
                        let validPassword = user.comparePassword(req.body.old_password);

                        if(validPassword) {
                            user.password = req.body.new_password;

                            user.save(function (err) {
                                if(err) {
                                    res.json({
                                        success : false,
                                        message : 'Something went wrong!'
                                    })
                                } else {
                                    res.json({
                                        success : true,
                                        message : 'Password successfully updated.'
                                    })
                                }
                            })
                        } else {
                            res.json({
                                success : false,
                                message : 'Old Password is incorrect.'
                            })
                        }
                    }
                }
            })
        }
    });

    // get all interview experiences
    router.get('/getAllInterviewExperiences', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            })
        } else {
            Interview.find({ status : 'approved' }).select('title experience author_name created_at tags').lean().exec(function (err, interviews) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Something went wrong!'
                    })
                } else {
                    if(!interviews) {
                        res.json({
                            success : false,
                            message : 'Interview not found.'
                        })
                    } else {
                        res.json({
                            success : true,
                            interviews : interviews
                        })
                    }
                }
            })
        }
    });

    // get interview experience
    router.get('/getExperience/:experience_id', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            })
        } else {
            Interview.findOne({ _id : req.params.experience_id }).lean().exec(function (err, experience) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Something went wrong!'
                    })
                } else {
                    if(!experience) {
                        res.json({
                            success : false,
                            message : 'Interview experience not found.'
                        })
                    } else {
                        res.json({
                            success : true,
                            experience : experience
                        })
                    }
                }
            })
        }
    });

    // Posting Interview experiences
    router.post('/postInterviewExperience', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            })
        } else {
            User.findOne({ college_id : req.decoded.college_id }).select('student_name').exec(function (err, user) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Something went wrong!'
                    })
                } else {
                    if(!user) {
                        res.json({
                            success : false,
                            message : 'User not found.'
                        })
                    } else {
                        let interview = new Interview();

                        interview.title = req.body.title;
                        interview.experience = req.body.experience;
                        interview.tags = req.body.tags;
                        interview.author_id = req.decoded.college_id;
                        interview.author_name = user.student_name;
                        interview.created_at = new Date();

                        interview.save(function (err) {
                            if(err) {
                                res.json({
                                    success : false,
                                    message : 'Something went wrong!'
                                })
                            } else {
                                res.json({
                                    success : true,
                                    message : 'Thanks for your contribution! Sit back and relax while our reviewers approves your interview experience.'
                                })
                            }
                        })
                    }
                }
            })
        }
    });

    // get contributions
    router.get('/getContributions', function (req, res) {
        if(!req.decoded.college_id) {
            res.json({
                success : false,
                message : 'Please login.'
            })
        } else {
            Interview.find({ author_id : req.decoded.college_id }).lean().exec(function (err, interviews) {
                if(err) {
                    res.json({
                        success : false,
                        message : 'Something went wrong!'
                    })
                } else {
                    if(!interviews) {
                        res.json({
                            success : false,
                            message : 'Interviews not found.'
                        })
                    } else {
                        res.json({
                            success : true,
                            interviews : interviews
                        })
                    }
                }
            })
        }
    });


    return router;
};

