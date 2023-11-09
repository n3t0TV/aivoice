
export class StoreMap {

    constructor(id, layout) {
        this.id = id;
        this.groups = [];
        this.aisles = {};
        this.layout = layout;
        for (const groupData of layout) {
            this.groups.push(new AisleGroup(this, groupData));
        }
        this.scaleX = 30;
        this.scaleY = 30;
    }

    render(container) {
        this.container = container;
        this.mapDiv = $('<div>', { id: `storemap-map-${this.id}` })
            .addClass(`storemap-map`).appendTo(container);

        for (const aisleGroup of Object.values(this.groups)) {
            aisleGroup.render();
            aisleGroup.groupDiv.appendTo(this.mapDiv);
        }

    }

    activate(aisleId,clickCallback) {
        const aisle = this.aisles[aisleId];
        if (!aisle) return;
        aisle.activate(clickCallback);
    }

    scrollTo(aisleId) {
        const aisle = this.aisles[aisleId];
        if (!aisle) return;

        const containerWidth = this.container.innerWidth();
        const containerHeight = this.container.innerHeight();
        const aisleWidth = aisle.aisleDiv.outerWidth();
        const aisleHeight = aisle.aisleDiv.outerHeight();

        const aislePosition = aisle.aisleDiv.position();
        const groupPosition = aisle.aisleGroup.groupDiv.position();
        const scrollLeft = aislePosition.left + groupPosition.left - (containerWidth - aisleWidth) / 2;
        const scrollTop = aislePosition.top + groupPosition.top - (containerHeight - aisleHeight) / 2;

        this.container.animate({
            scrollLeft: scrollLeft,
            scrollTop: scrollTop
        }, 500, () => {

            aisle.shelf.addClass('animate-color-change');
            setTimeout(() => {
                aisle.shelf.removeClass('animate-color-change');
            }, 1000);
        });

    }

}

class AisleGroup {
    constructor(storeMap, config) {
        this.storeMap = storeMap;
        this.id = config.id;
        this.config = config;
        this.aisles = [];

        for (let i = config.min; i <= config.max; i++) {
            const aisleId = `${this.id}${i}`;
            const aisle = new Aisle(this, aisleId);
            this.aisles.push(aisle);
            storeMap.aisles[aisleId] = aisle;
        }
    }
    render() {
        const config = this.config;
        const scaleY = this.storeMap.scaleY;
        const scaleX = this.storeMap.scaleX;

        if (!this.groupDiv) {
            this.groupDiv = $('<div>')
                .addClass(`.storemap-group-${this.id} storemap-group storemap-group-orientation-${config.orientation} storemap-group-alignment-${config.alignment}`)
                .addClass(`storemap-group storemap-group-wall-${config.wall}`);

            if (config.alignment && !config.orientation || !config.alignment && config.orientation) {
                this.groupDiv.addClass('storemap-group-alternate');
            }
            const step = 100 / this.aisles.length;

            for (let i = 0; i < this.aisles.length; i++) {
                const aisle = this.aisles[i];
                aisle.render();
                aisle.aisleDiv.appendTo(this.groupDiv);
                if (config.alignment && !config.orientation || !config.alignment && config.orientation) {
                    aisle.aisleDiv.css((config.orientation) ? "height" : "width", "100%");
                    aisle.aisleDiv.css((config.orientation) ? "width" : "height", `${step}%`);
                } else {
                    aisle.aisleDiv.css({
                        width: `${step}%`,
                        height: `${step}%`
                    });
                }

                aisle.aisleDiv.css((config.alignment) ? "left" : "top", "0");
                aisle.aisleDiv.css((config.alignment) ? "top" : "left", `${(config.order > 0) ? i * step : 100 - (i + 1) * step}%`);

            }
        }

        this.groupDiv.css({
            top: `${scaleY * config.y}px`,
            left: `${scaleX * config.x}px`,
            width: `${scaleX * config.width}px`,
            height: `${scaleY * config.height}px`,
        });
    }

}

class Aisle {
    constructor(aisleGroup, id) {
        this.aisleGroup = aisleGroup;
        this.id = id;
    }
    render() {
        if (this.aisleDiv) return;
        this.aisleDiv = $('<div>', { id: `storemap-aisle-${this.id}` })
            .addClass(`storemap-aisle storemap-group-${this.aisleGroup.id}-aisle`);
        this.shelf = $('<div>', { id: `storemap-aisle-${this.id}-shelf` })
            .addClass(`storemap-aisle-shelf`).appendTo(this.aisleDiv);
        this.label = $('<div>', { id: `storemap-aisle-${this.id}-label` })
            .addClass(`storemap-aisle-label`).appendTo(this.aisleDiv)
            .html(this.id);
    }
    activate(clickCallback) {
        this.aisleDiv.addClass('active');
        this.aisleDiv.click(clickCallback);
    }
    loadBreadcrumb(breadcrumb) {
        this.breadcrumb = breadcrumb.split('|');
        this.aisleDiv.attr('title', this.breadcrumb.at(-1));
    }
}