const fs = require('fs');
try {
    let content = fs.readFileSync('public/results.html', 'utf-8');

    // 1. Refresh Button: Make it perfectly square (btn-icon) and add onclick
    const refreshRegex = /<button class="btn btn-outline-primary[^>]*>[\s\S]*?<i class="ti ti-refresh[^>]*><\/i>[\s\S]*?<\/button>/;
    content = content.replace(refreshRegex, `<button class="btn btn-label-secondary btn-icon" onclick="reloadCurrentPage()" style="border-radius: 6px; box-shadow: 0 0 0 1px #696cff inset; background: white !important; color: #696cff !important;">
            <i class="ti ti-refresh"></i>
        </button>`);
    
    // Wait, let's just make it exact:
    // <button class="btn btn-outline-primary btn-icon rounded"><i class="ti ti-refresh"></i></button>
    content = content.replace(/<button class="btn btn-label-secondary[^>]*>[\s\S]*?<i class="ti ti-refresh[^>]*><\/i>[\s\S]*?<\/button>/, 
        `<button class="btn btn-outline-primary btn-icon" onclick="reloadCurrentPage()"><i class="ti ti-refresh fs-5"></i></button>`);

    // 2. Search Bar: Clean inline borders to let sneat handle it, and make X exactly like Sneat
    const searchRegex = /<!-- Search Bar & Filters -->[\s\S]*?<!-- Filter Chips -->/;
    const pristineSearch = `<!-- Search Bar & Filters -->
    <div class="mb-3">
        <div class="input-group input-group-merge" style="border-radius: 8px;">
            <span class="input-group-text"><i class="ti ti-search text-muted"></i></span>
            <input type="text" class="form-control" placeholder="Search by Match ID or title...">
            <span class="input-group-text cursor-pointer"><i class="ti ti-x text-muted"></i></span>
        </div>
    </div>

    <!-- Filter Chips -->`;
    content = content.replace(searchRegex, pristineSearch);

    // 3. Restore Red YT icon
    // First let's check if the position-relative div wrapper is there.
    const regexImg = /(<div class="position-relative">\s*<img src="https:\/\/i\.ibb\.co\.com\/q3qTfbXR\/free-fire-thumbnail-300x300\.png" style="width: 55px; height: 55px; border-radius: 10px; object-fit: cover;">)(\s*<\/div>)/g;
    
    const ytOverlay = `\n                        <span class="position-absolute bottom-0 end-0 bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 16px; height: 16px; font-size: 10px; transform: translate(30%, 30%); box-shadow: 0 0 0 2px #fff;"><i class="ti ti-brand-youtube"></i></span>`;
    
    // If it doesn't already have the ytOverlay, put it back
    if (!content.includes('ti-brand-youtube')) {
        content = content.replace(regexImg, `$1${ytOverlay}$2`);
    }

    fs.writeFileSync('public/results.html', content);
    console.log("Fixes applied successfully");
} catch(e) {
    console.error(e);
}
