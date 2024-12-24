function Color(colorString) {
    this.init(colorString);
}
function rndNumber(min, max) {
    return (min + Math.random() * (max + 1 - min))^0;
}
Color.prototype = {
    init: function(colorString) {
        // generate random color if undefined
        if (colorString == undefined)
            colorString = `rgb(${rndNumber(0, 255)}, ${rndNumber(0, 255)}, ${rndNumber(0, 255)})`;
        // remove any leading #
        if (colorString.charAt(0) == '#')
            colorString = colorString.substr(1);
        // remove all spaces and convert string to lower case
        colorString = colorString.replace(/ /g,'').toLowerCase();

        // array of color definition objects
        var color_defs = [
        {
            re: /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/,
            example: ['rgb(123, 234, 45)', 'rgb(255,234,245)'],
            process: function (bits) {
                return [
                    parseInt(bits[1]),
                    parseInt(bits[2]),
                    parseInt(bits[3])
                ];
            }
        },
        {
            re: /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*((\d{1,3})|(\d?\.\d*))\)$/,
            example: ['rgba(123, 234, 45, .5)', 'rgba(255,234,245,0.5)'],
            process: function (bits) {
                return [
                    parseInt(bits[1]),
                    parseInt(bits[2]),
                    parseInt(bits[3]),
                    parsefloat(bits[4])
                ];
            }
        },
        {
            re: /^(\w{2})(\w{2})(\w{2})(\w{2})?$/,
            example: ['#00ff00', '336699', 'aa6699ff'],
            process: function (bits) {
                return [
                    parseInt(bits[1], 16),
                    parseInt(bits[2], 16),
                    parseInt(bits[3], 16),
                    parseInt(bits[4], 16)
                ];
            }
        },
        {
            re: /^(\w{1})(\w{1})(\w{1})(\w{1})?$/,
            example: ['#fb0', 'f0f', 'f0ff'],
            process: function (bits) {
                return [
                    parseInt(bits[1] + bits[1], 16),
                    parseInt(bits[2] + bits[2], 16),
                    parseInt(bits[3] + bits[3], 16),
                    parseInt(bits[4] + bits[4], 16)
                ];
            }
        }];

        // search through the definitions to find a match
        for (var i = 0; i < color_defs.length; i++) {
            var re = color_defs[i].re;
            var processor = color_defs[i].process;
            var bits = re.exec(colorString);
            if (bits) {
                var channels = processor(bits);
                this.r = channels[0];
                this.g = channels[1];
                this.b = channels[2];
                this.a = channels[3];
            }
        }

        // validate/cleanup values
        this.r = (this.r < 0 || isNaN(this.r)) ? 0 : ((this.r > 255) ? 255 : this.r);
        this.g = (this.g < 0 || isNaN(this.g)) ? 0 : ((this.g > 255) ? 255 : this.g);
        this.b = (this.b < 0 || isNaN(this.b)) ? 0 : ((this.b > 255) ? 255 : this.b);
        this.a = ((isNaN(this.a) || this.a > 255) ? 255 : (this.a < 0) ? 0 : (this.a <= 1) ? Math.round(this.a * 255) : Math.round(this.a));

        // set up initial hsv
        this.setRGB(this.r, this.g, this.b);
    },
    setRGB: function(r, g, b) { // null = don't change
        var hsv = this.RGB_HSV(r==null ? this.r : (this.r = r), g==null ? this.g : (this.g = g), b==null ? this.b : (this.b = b));

        if (hsv[0] != null) {
            this.h = hsv[0];
        }

        if (hsv[2] != 0) {
            this.s = hsv[1];
        }

        this.v = hsv[2];
    },
    setHSV: function(h, s, v) { // null = don't change
        var rgb = this.HSV_RGB(h==null ? this.h : (this.h=h), s==null ? this.s : (this.s=s), v==null ? this.v : (this.v=v));

        this.r = rgb[0];
        this.g = rgb[1];
        this.b = rgb[2];
    },
    RGB_HSV: function(r, g, b) {
        var n = Math.min(Math.min(r, g), b);
        var v = Math.max(Math.max(r, g), b);
        var m = v - n;

        if(m == 0) {
            return [ null, 0, v ];
        }

        var h = r==n ? 3 + (b - g) / m : (g == n ? 5 + (r - b) / m : 1 + (g - r) / m);

        return [ h == 6? 0: h, m / v, v ];
    },
    HSV_RGB: function(h, s, v) {
        if (h == null) {
            return [ v, v, v ];
        }

        var i = Math.floor(h);
        var f = i % 2 ? h - i : 1 - (h - i);
        var m = v * (1 - s);
        var n = v * (1 - s * f);

        switch(i) {
            case 6:
            case 0:
                return [ v, n, m ];
            case 1:
                return [ n, v, m ];
            case 2:
                return [ m, v, n ];
            case 3:
                return [ m, n, v ];
            case 4:
                return [ n, m, v ];
            case 5:
                return [ v, m, n ];
        }
    },
    toHEXString: function() {
        return '#' + ((1 << 24) + (this.r << 16) + (this.g << 8) + this.b).toString(16).slice(1).toUpperCase();
    },
    toHEXAString: function() {
        let hex = ((1 << 24) + (this.r << 16) + (this.g << 8) + this.b).toString(16).slice(1);
        let alphaHex = this.a.toString(16);
        if(alphaHex.length == 1)
            alphaHex = alphaHex.padStart(2, '0');
        return '#' + (hex + alphaHex).toUpperCase();
    },
    toRGBArray: function() {
        return [this.r, this.g, this.b];
    },
    toRGBAArray: function() {
        return [this.r, this.g, this.b, this.a];
    },
    toHSVArray: function() {
        return [this.h, this.s, this.v];
    },
    toHSVAArray: function() {
        let alphaСhannel = parseFloat((this.a / 255).toFixed(1));
        return [this.h, this.s, this.v, alphaСhannel];
    },
    interpolation: function (a, b) {
        var arr = [];
        var factor = rndNumber(0,100) * 0.01;
        for(var i = 0; i < Math.min(a.length, b.length); i++)
            arr[i] = a[i] * (1 - factor) + b[i] * factor;
        this.setRGB(Math.round(arr[0]), Math.round(arr[1]), Math.round(arr[2]));
    }
}