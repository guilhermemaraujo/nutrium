class PagesController < ApplicationController
  def index; end

  def not_found
    render :index, status: :not_found
  end
end
