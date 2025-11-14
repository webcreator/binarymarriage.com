const {createApp} = Vue

const getForm = (url) => {
    let token = document.querySelector('[name="csrf-token"]').getAttribute('content').trim();
    let userToken = window.localStorage.getItem('token');

    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            "X-CSRF-Token": token,
            'X-USER': userToken
        },
    })
}

const postForm = (url, data) => {
    let token = document.querySelector('[name="csrf-token"]').getAttribute('content').trim();
    let userToken = window.localStorage.getItem('token');

    return fetch(url, {
        method: 'POST',
        body: data,
        headers: {
            'Accept': 'application/json',
            "X-CSRF-Token": token,
            'X-USER': userToken
        },
    })
}

const FormHeader = {
    props: ['title', 'step'],

    methods: {
        classList(s) {
            return {
                'popup__progressbar-item': true,
                '_checked': s <= this.step
            }
        }
    },

    template: `
<div class="popup__header-block">
    <div class="popup__progressbar" v-if="step < 6">
        <div :class="classList(1)"></div>
        <div :class="classList(2)"></div>
        <div :class="classList(3)"></div>
        <div :class="classList(4)"></div>
        <div :class="classList(5)"></div>
    </div>
    <h3 class="popup__title">{title}</h3>
</div>`
};

const DefButton = {
    props: ['title', 'processing'],
    template: `
<button type="button" v-if="!processing" :class="$attrs['class']" @click="$emit('click', $event)">
    <span>{title}</span>
</button>
<div v-if="processing" class="dots-loader"></div>`
};

const PhotoUploader = {
    props: ['photo'],
    emits: ['onDone', 'onError'],
    data: function () {
        return {
            mode: 1,
            processImageUrl: null,
            croper: null,

            processing: false,
            processingUpload: false,
            processingCrop: false,
        }
    },
    computed: {
        urlWithTs() {
            if (!this.photo) {
                return '';
            }
            return this.photo + '?time=' + Date.now();
        }
    },
    methods: {
        initCrop(url, elId) {
            return new Croppie(this.$refs['image_box'], {
                url: url,
                viewport: {
                    width: 300,
                    height: 300,
                    type: 'circle'
                },
                boundary: {width: 350, height: 350},
            });
        },

        userPhoto(e) {
            let files = e.target.files;
            if (files.length > 0) {
                let file = files[0];

                this.processingUpload = true;

                this.uploadPhoto(file, 'image_box').then((data) => {

                    if (data.url) {
                        this.processImageUrl = data.url;
                        if (this.croper) {
                            this.croper.destroy();
                        }
                        this.croper = this.initCrop(data.url, 'image_box');
                        this.mode = 2;
                    } else {
                        this.$emit('onError', data.message ? data.message : 'Fail');
                    }

                    this.processingUpload = false;
                })

            } else {

            }
        },

        approveImage(e, type) {
            e.preventDefault();
            let params = {
                url: this.processImageUrl,
                details: this.croper.get()
            }

            this.processingCrop = true;

            const data = new URLSearchParams();
            data.append('url', params.url);
            data.append('details', JSON.stringify(params.details));

            postForm('/certificates/crop/photo', data).then((response) => {

                if (response.status === 401) {
                    this.$emit('onError', 'Login required');
                }

                return response.json();
            }).then((data) => {
                if (data.message) {
                    throw new Error(data.message);
                }
                if (data.url) {
                    this.$emit('onDone', data.url);
                    this.mode = 3;
                    this.processingCrop = false;
                } else {
                    throw new Error('Fail crop photo.');
                }
            }).catch((error) => {
                console.log(error)

                let msg = error ? error : 'Fail upload photo';

                this.$emit('onError', msg);

                this.processingCrop = false;
            });

        },

        deleteImage(e, type) {
            e.preventDefault();
            this.croper.destroy();
            this.croper = null;
            this.mode = 1;
        },

        changeImage(e, type) {
            e.preventDefault();
            this.mode = 1;
            this.$emit('onDone', null);
        },


        uploadPhoto(file) {

            var promise = new Promise((resolve, reject) => {

                let img = new Image();
                var objectUrl = URL.createObjectURL(file);
                img.onload = function () {
                    let imageSizeCorrect = this.width >= 1000 && this.height >= 100;
                    URL.revokeObjectURL(objectUrl);

                    if (imageSizeCorrect) {
                        resolve(file);
                    } else {
                        reject('Image size isn\'t right. Min height: 1000px. Min width: 1000px')
                    }

                };
                img.src = objectUrl;
            });

            return promise.then(() => {
                var data = new FormData()
                data.append('image', file)
                return data;
            }).then((data) => {
                return postForm('/certificates/upload/photo', data);
            }).then((response) => response.json())
                .then((data) => {
                    if (data.message) {
                        throw new Error(data.message);
                    }
                    if (data.url) {
                        return {url: data.url};
                    } else {
                        throw new Error('Fail upload photo. Try again.');
                    }
                }).catch((error) => {
                    console.log(error)

                    return {message: 'Fail upload photo: ' + error}
                });
        },
    },
    mounted() {
        let dropArea = this.$refs.dragAndDrop;
        const button = dropArea.querySelector("button"), input = dropArea.querySelector("input");
        let files;
        button.onclick = () => {
            input.click();
        };
        input.addEventListener("change", (function () {
            files = this.files;
            showFile();
        }));
        dropArea.addEventListener("dragover", (event => {
            event.preventDefault();
        }));
        dropArea.addEventListener("dragleave", (() => {
        }));
        dropArea.addEventListener("drop", (event => {
            event.preventDefault();
            files = event.dataTransfer.files;
            showFile();
        }));

        function showFile() {
            let file;
            for (let i = 0; i < files.length; i++) {
                file = files[i];
                let fileType = file.type;
                let validExtensions = ["image/jpeg", "image/jpg", "image/png"];
                if (validExtensions.includes(fileType)) {
                    let fileReader = new FileReader;
                    fileReader.onload = () => {
                        fileReader.result;
                    };
                    fileReader.readAsDataURL(file);
                } else alert("This is not an Image File!");
            }
        }
    },
    template: `
    <template v-if="1">
    <div class="popup__dropanddrag dropanddrag form-popup__dropanddrag" ref="dragAndDrop"
            v-show="mode === 1">
            <div class="dropanddrag__icon _icon-upload"></div>
            <div class="dropanddrag__text">
                Drag and drop your photo here or click to select file
            </div>
            <div class="dropanddrag__add-file">
                <button type="button" for="dropanddrag-file"
                class="dropanddrag__label button">
                    Browse files
                </button>
                <input autocomplete="off" type="file" @change="userPhoto"
                       accept=".jpg" hidden class="input dropanddrag__input"/>
            </div>
            <div v-if="processingUpload" style="text-align: center;width: 100%;font-size: 16px">Uploading...</div>
        </div>
        <div class="popup__dropanddrag dropanddrag form-popup__dropanddrag" v-show="mode === 2">

            <div ref="image_box"></div>
            <div class="">
                <button type="button" class="dropanddrag__label button"
                style="margin-right: 5px"
                @click="approveImage($event, 1)">Approve</button>
                <button type="button" class="dropanddrag__label dropanddrag__label-delete button"
                style="margin-left: 5px"
                @click="deleteImage($event, 1)">Delete</button>
            </div>
            <div v-if="processingCrop" style="text-align: center;width: 100%;font-size: 16px">Saving...</div>
        </div>
        <div class="popup__dropanddrag dropanddrag form-popup__dropanddrag" v-show="mode === 3">
            <img :src="urlWithTs" class="person-photo">
            <div class="">
                <button type="button" class="dropanddrag__label button" @click="changeImage($event, 1)">Change</button>
            </div>
    </div>
</template>
    `
};


const DateField = {
    props: ['modelValue'],
    emits: ['update:modelValue'],

    data() {
        return {
            obj: null
        }
    },

    mounted() {
        this.obj = new Cleave(this.$refs.input_date, {
            date: true,
            delimiter: '.',
            datePattern: ['d', 'm', 'Y']
        });

        this.$refs.input_date.addEventListener("keyup", (e) => {
            this.$emit('update:modelValue', e.target.value)
        });
    },

    template: `<div class="form-popup__row _icon-date">
        <input autocomplete="off" type="text"
               ref="input_date"
               placeholder="Date of birth (dd.mm.yyyy)"
               :value="modelValue"
               class="input form-popup__input"/>
    </div>`
};


var app = createApp({
    components: {FormHeader, DefButton, PhotoUploader, DateField},
    data() {
        return {
            appMode: 1,
            processing: false,

            wallet: '',

            title: '1. Upload your photo',
            step: 6,

            processImageUrl: null,

            your_photo_url: null,
            your_photo_url_preview: null,
            your_photo_cropper: null,
            your_photo: null,
            your_photo_mode: 1,
            your_email: '',
            your_name: '',
            your_bday: '',

            step_1: false,
            step_1_error: '',

            border_color: '#657EFA',

            step_2: false,
            step_2_error: '',

            beloved_photo_url: null,
            beloved_photo_url_preview: null,
            beloved_photo_cropper: null,
            beloved_photo: '',
            beloved_photo_mode: 1,
            beloved_email: '',
            beloved_name: '',
            beloved_bday: '',

            step_3: false,
            step_3_error: '',

            beloved_border_color: '#657EFA',

            theme: '',
            font: 'Inter',

            step_4: false,
            step_4_error: '',

            step_5: false,
            step_5_error: '',

            step_6_error: '',

            certificateUrl: '',
            code: '',
            issued: '',

            sharedObj: null,

            defPrice: '19',
            nftPrice: '19',
            coupon: '',

            titles: {
                1: '1. Upload your photo',
                2: '2. Customize your photo',
                3: '3. Upload photo of your beloved',
                4: '4. Customize beloved photo',
                5: '5. Customize your Certificate',
                6: '6. Certificate Preview'
            },

            login_error: '',

            userCertificates: null
        }
    },
    watch: {
        step: function () {
            this.setTitle()
        }
    },
    computed: {

        isStep1() {
            return this.step === 1;
        },
        isStep2() {
            return this.step === 2;
        },
        isStep3() {
            return this.step === 3;
        },
        isStep4() {
            return this.step === 4;
        },
        isStep5() {
            return this.step === 5;
        },
        isStep6() {
            return this.step === 6;
        },
    },
    methods: {
        onPageMyCertificate(e) {
            e.preventDefault();

            getForm('/certificates', {}, 'GET')
                .then((r) => r.json())
                .then((items) => {
                    this.userCertificates = items;
                    this.appMode = 2;
                    console.log(this.userCertificates)
                })
        },

        setTitle() {
            this.title = this.titles[this.step];
        },

        startSteps(e) {
            this.step = 1;
            window.flsModules.popup.open('#start');
        },

        prevStep(e) {
            this.step -= 1;
        },

        validateEmail(email) {
            return String(email)
                .toLowerCase()
                .match(
                    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                );
        },

        validateDate(d) {
            let arr = d.match(/(\d+)\.(\d+)\.(\d+)/);
            if (!arr) {
                throw new Error('Date of birth not correct');
            }

            let dd = new Date(arr[3], arr[2], arr[1]);
            let years = (Date.now() - dd.getTime()) / 31536000000;

            if (years < 18) {
                throw new Error('Person too young.');
            }

            if (years > 150) {
                throw new Error('Person ' + years.toFixed(0) + ' years old and probably already dead.');
            }
        },

        onDone1(url) {
            this.step_1_error = '';
            this.your_photo_url = url;
            this.your_photo_url_preview = url + '?time=' + Date.now();
        },

        onError1(msg) {
            this.step_1_error = msg;
        },

        onDone2(url) {
            this.step_3_error = '';
            this.beloved_photo_url = url;
            this.beloved_photo_url_preview = url + '?time=' + Date.now();
        },

        onError2(msg) {
            this.step_3_error = msg;
        },

        passAct(e) {
            e.preventDefault();
        },


        step1Done(e) {
            e.preventDefault();

            if (!this.your_photo_url) {
                this.step_1_error = 'Please upload your photo';
                return false;
            }

            if (this.your_email.trim().length === 0) {
                this.step_1_error = 'Enter your email';
                return false;
            }

            if (!this.validateEmail(this.your_email.trim())) {
                this.step_1_error = 'Wrong email';
                return false;
            }

            if (this.your_name.trim().length === 0) {
                this.step_1_error = 'Full name is required';
                return false;
            }

            try {
                this.validateDate(this.your_bday);
            } catch (e) {
                this.step_1_error = e.message;
                return false;
            }

            this.step_1_error = '';

            this.step = 2;
        },

        step2Done(e) {
            e.preventDefault();
            this.step = 3;
        },

        step3Done(e) {
            e.preventDefault();

            if (!this.beloved_photo_url) {
                this.step_3_error = 'Please upload beloved photo';
                return false;
            }

            if (this.beloved_email.trim().length === 0) {
                this.step_3_error = 'Enter beloved email';
                return false;
            }

            if (!this.validateEmail(this.beloved_email.trim())) {
                this.step_3_error = 'Wrong email';
                return false;
            }

            if (this.beloved_name.trim().length === 0) {
                this.step_3_error = 'Full name is required';
                return false;
            }

            try {
                this.validateDate(this.beloved_bday);
            } catch (e) {
                console.log(e)
                this.step_3_error = e.message;
                return false;
            }

            this.step_3_error = '';

            this.step = 4;
        },

        step4Done(e) {
            e.preventDefault();
            this.step = 5;
        },

        step5Done(e) {
            e.preventDefault();
            this.processing = true;
            this.submit().then((data) => {
                if (data.certificateUrl) {
                    this.certificateUrl = data.certificateUrl;
                }
                if (data.code) {
                    this.code = data.code;
                }
                if (data.issued) {
                    this.issued = data.issued;
                }
                if (data.code && data.certificateUrl) {
                    this.step = 6;
                }
                this.processing = false;
            }).catch((error) => {
                console.log(error)
                this.step_5_error = 'Submit fail: ' + error;
                this.processing = false;
            });
        },

        onCheckout(e) {
            e.preventDefault();
            if (this.code) {

                if (this.processing) {
                    alert('Please wait until the process is completed.')
                    return false;
                }

                const data = new URLSearchParams();
                data.append('code', this.code);
                data.append('coupon', this.coupon);

                this.processing = true;
                this.step_6_error = '';

                postForm('/checkout', data)
                    .then((response) => {
                        return response.json();
                    }).then((data) => {
                    if (data.message) {
                        throw new Error(data.message);
                    }

                    if (data.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                        this.processing = false;
                    } else {
                        throw new Error('Fail generate checkout url. Please, contact to support.');
                    }

                }).catch((error) => {
                    this.step_6_error = error.message;
                    this.processing = false;
                });

            } else {
                this.step_6_error = 'Fail generate checkout url. Please, contact to support.';
            }
        },

        submit() {
            let submitData = {
                your_photo_url: this.your_photo_url,
                your_email: this.your_email,
                your_name: this.your_name,
                your_bday: this.your_bday,

                border_color: '#657EFA',

                beloved_photo_url: this.beloved_photo_url,
                beloved_email: this.beloved_email,
                beloved_name: this.beloved_name,
                beloved_bday: this.beloved_bday,

                beloved_border_color: this.beloved_border_color,

                theme: this.theme,
                font: this.font,
            };

            const data = new URLSearchParams();
            Object.keys(submitData).forEach((key) => {
                data.append(key, submitData[key])
            })

            this.processing = true;
            this.step_5_error = '';

            return postForm('/certificates/submit', data)
                .then((response) => {
                    return response.json();
                }).then((data) => {
                    if (data.message) {
                        throw new Error(data.message);
                    }

                    this.processing = false;
                    return data;
                }).catch((error) => {
                    console.log(error)
                    this.processing = false;
                    throw new Error(error.message);
                });
        },

        onLogin() {
            this.login_error = '';

            if (typeof window.ethereum === 'undefined') {
                this.login_error = 'Wallet not detected';
                return false;
            }

            window.ethereum.request({method: 'eth_requestAccounts'}).then((acc) => {
                console.log(acc);
                return acc[0];
            }).catch(() => {
                this.login_error = 'Fail get wallet';
            }).then((acc) => {

                let submitData = {
                    wallet: acc,
                };

                const data = new URLSearchParams();
                Object.keys(submitData).forEach((key) => {
                    data.append(key, submitData[key])
                })

                this.processing = true;

                return postForm('/users/login', data);
            }).then((response) => {
                return response.json();
            }).then((data) => {
                if (data.message) {
                    throw new Error(data.message);
                }

                this.processing = false;

                if (!data.wallet) {
                    throw new Error('Login fail.');
                }

                this.login(data);

                window.flsModules.popup.open('#start');

            }).catch((error) => {
                console.log(error)
                this.login_error = 'Login fail.' + error;
                this.processing = false;
            });

        },

        login(data) {
            window.localStorage.setItem('wallet', data.wallet);
            window.localStorage.setItem('token', data.token);
            this.wallet = data.wallet;
        },

        resetLogin() {
            window.localStorage.removeItem('wallet');
            window.localStorage.removeItem('token');
            this.wallet = '';
        },

        checkCoupon(c) {
            const data = new URLSearchParams();
            data.append('coupon', c);

            postForm('/certificates/coupon', data)
            .then((response) => {return response.json()})
                .then((resp) => {
                    if (parseFloat(resp.price)) {
                        this.nftPrice = resp.price;
                    } else {
                        this.nftPrice = this.defPrice;
                    }

                    console.log('Coupon price', parseFloat(resp.price))
            });
        }

    },
    /*errorCaptured: function (err) {
        console.log('Caught error', err);
        return false;
    },*/
    mounted() {

        let m = window.location.href.match(/coupon\=(\w+)/);
        if (m && m.length === 2) {
            this.coupon = m[1];

            this.checkCoupon(this.coupon);

            window.inter = setInterval(() => {
                if (window.flsModules) {
                    clearInterval(window.inter);
                    this.startSteps();
                }
            }, 500)
        }

        let w = window.localStorage.getItem('wallet');
        this.wallet = w ? w : '';
    }
});
app.config.compilerOptions.delimiters = ['{', '}']
window.vm = app.mount('#app')


window.userLogin = function (address) {
    let submitData = {
        wallet: address,
    };

    const data = new URLSearchParams();
    Object.keys(submitData).forEach((key) => {
        data.append(key, submitData[key])
    })

    this.processing = true;

    return postForm('/users/login', data)
        .then((data) => data.json())
        .then((data) => {
            if (data.message) {
                throw new Error(data.message);
            }

            if (!data.wallet) {
                console.log(data)
                throw new Error('Login fail.');
            }

            window.localStorage.setItem('wallet', data.wallet);
            window.localStorage.setItem('token', data.token);
            window.vm.$data.wallet = data.wallet;
            window.vm.startSteps();
        })
}
