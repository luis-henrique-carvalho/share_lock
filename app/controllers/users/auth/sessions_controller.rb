# frozen_string_literal: true

class Users::Auth::SessionsController < Devise::SessionsController
  def new
    # Use the default Devise behavior but override the template
    super
  end

  private

  def respond_with(resource, _opts = {})
    render Views::Users::Auth::Sessions::New.new(
      resource: resource,
    )
  end
end
