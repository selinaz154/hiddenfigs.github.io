const asyncSleep = async (ms = 100) => {
  return new Promise((r) => setTimeout(r, ms));
};

let currentSearchID = 0;

// See https://github.com/CloudCannon/pagefind/issues/441
async function debouncedSearch(
  pf,
  term,
  options = {},
  debounceTimeoutMs = 300,
) {
  if (
    options.filters.relevantCourses.length == 0 &&
    options.filters.researchAreas.length == 0
  ) {
    const searchResult = await pf.search(term);
    return searchResult;
  }
  options.filters.relevantCourses = options.filters.relevantCourses.map(
    (course) => course.toLowerCase(),
  );
  options.filters.researchAreas = options.filters.researchAreas.map((area) =>
    area.toLowerCase(),
  );
  const thisSearchID = ++currentSearchID;
  await asyncSleep(debounceTimeoutMs);

  if (thisSearchID !== currentSearchID) {
    return null;
  }
  if (options.filters && options.filters.type) {
    delete options.filters.type;
  }
  const searchResult = await pf.search(term, options);
  if (thisSearchID !== currentSearchID) {
    return null;
  }
  return searchResult;
}

export default function searchPeople() {
  return {
    filterType: "scientist",
    filterResearchAreas: [],
    filterRelevantCourses: [],
    query: "",
    pagefind: null,
    error: null,
    isLoading: false,
    results: null,
    resultCount: 0,

    async init() {
      let pagefind;
      try {
        pagefind = await import("/pagefind/pagefind.js");
        await pagefind.options({ excerptLength: 10 });
        await pagefind.init();
      } catch (e) {
        this.error = e;
        return;
      }
      this.pagefind = pagefind;
      for (let param of [
        "query",
        "filterType",
        "filterResearchAreas",
        "filterRelevantCourses",
      ]) {
        this.$watch(param, () => this.search());
      }
    },

    async search() {
      // searchBox
      let query = this.query;
      // Don't wait for an empty search
      let timeout = this.query.trim() ? 300 : 0;
      this.isLoading = true;
      this.resultCount = 0;
      let options = {};
      if (this.filterType) {
        options.filters = {
          type: this.filterType,
        };
        options.filters.researchAreas = this.filterResearchAreas.map(
          (f) => f.value,
        );
        options.filters.relevantCourses = this.filterRelevantCourses.map(
          (f) => f.value,
        );
      }
      if (this.hasFilters && !query) {
        query = null; // magic value for show all in category
      }

      let results;
      try {
        const search = await debouncedSearch(
          this.pagefind,
          query,
          options,
          timeout,
        );
        if (search === null) return;
        results = await Promise.all(search.results.map((r) => r.data()));
        this.resultCount = search.results.length;
      } catch (e) {
        this.resultCount = 0;
        this.error = e;
        this.isLoading = false;
        return;
      }
      this.results = results;
      this.isLoading = false;
    },

    clear() {
      this.query = "";
      this.isLoading = false;
      this.results = null;
      this.error = null;
    },

    get showClearButton() {
      if (this.isLoading) return false;
      return !!this.query.trim();
    },

    get people() {
      if (!this.results) return [];
      return this.results.map((data) => ({
        id: data.url,
        url: data.url,
        name: data.meta.title,
        excerpt: data.excerpt,
        role: data.meta.role || "",
        researchAreas: data.filters.researchAreas || [], // New Filter
        relevantCourses: data.filters.relevantCourses || [],
        image: data.meta.image,
        alt: data.meta.image_alt,
        srcset: data.meta.image_srcset,
        width: data.meta.image_width,
        height: data.meta.image_height,
      }));
    },

    get hasFilters() {
      return (
        this.filterResearchAreas.length || this.filterRelevantCourses.length
      );
    },

    get resultsText() {
      if (this.isLoading || !this.results) return "\u00a0";
      if (!this.query && !this.hasFilters) return "\u00a0";

      let total = this.resultCount;
      let shown = this.results.length;

      if (total < 1) {
        return "No search results.";
      }
      if (total === 1) {
        return "Got one search result.";
      }
      let more = total > shown ? `Showing first ${shown} results.` : "";
      return `Got ${total} search results. ${more}`;
    },

    andMore(a) {
      if (a.length > 3) {
        return a.slice(0, 2).join(", ") + " and more";
      }
      return a.join(", ");
    },
  };
}
