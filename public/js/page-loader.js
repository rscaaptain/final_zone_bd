(function() {
    if (!document.querySelector('.progress-loader')) {
        let css = `
        .progress-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            z-index: 999999;
            display: none;
        }
        .progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #696cff 0%, #5f61e6 50%, #696cff 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            transition: width 0.2s ease;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `;
        let style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        let loaderHtml = document.createElement('div');
        loaderHtml.className = 'progress-loader';
        loaderHtml.innerHTML = '<div class="progress-bar"></div>';
        document.body.prepend(loaderHtml);
    }

    let loadInterval;

    function startProgress() {
        let loader = document.querySelector('.progress-loader');
        let bar = document.querySelector('.progress-bar');
        if(!loader || !bar) return;
        clearInterval(loadInterval);
        loader.style.transition = 'none';
        loader.style.opacity = '1';
        loader.style.display = 'block';
        bar.style.transition = 'width 0.2s ease';
        let progress = 0;
        loadInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 15;
                bar.style.width = Math.min(progress, 90) + '%';
            }
        }, 100);
    }

    function finishProgress() {
        let loader = document.querySelector('.progress-loader');
        let bar = document.querySelector('.progress-bar');
        if(!loader || !bar) return;
        clearInterval(loadInterval);
        bar.style.transition = 'width 0.3s ease';
        bar.style.width = '100%';
        setTimeout(() => {
            loader.style.transition = 'opacity 0.3s ease';
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                bar.style.width = '0%';
            }, 300);
        }, 400);
    }

    startProgress();

    if(document.readyState === 'complete' || document.readyState === 'interactive') {
        finishProgress();
    } else {
        document.addEventListener('DOMContentLoaded', finishProgress);
        window.addEventListener('load', finishProgress);
    }

    window.addEventListener('beforeunload', startProgress);
    
    document.addEventListener('click', (e) => {
        let t = e.target.closest('a');
        if (t && t.href && t.target !== '_blank' && !t.hasAttribute('download') && t.host === window.location.host) {
            startProgress();
        }
    });

    let originalFetch = window.fetch;
    window.fetch = async function(...args) {
        let url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
        let showLoader = false;
        if (url && (url.includes('/api/auth') || url.includes('/api/matches/join') || url.includes('search'))) {
            showLoader = true;
        }
        if(showLoader) startProgress();
        try {
            let res = await originalFetch.apply(this, args);
            if(showLoader) finishProgress();
            return res;
        } catch(err) {
            if(showLoader) finishProgress();
            throw err;
        }
    };
})();
