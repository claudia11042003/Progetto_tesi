import React from "react";
import "./Loading.css"

export function  Loading  ({ isLoading })  {
  return (
    <div>
      {isLoading && (
        <div className="bigone">
          <div className="spinner-border text-blue-500" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};
